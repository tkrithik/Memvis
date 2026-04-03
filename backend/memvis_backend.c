/*
 * memvis_backend.c  —  cross-platform (macOS + Linux)
 *
 * Usage:  memvis_backend <source.c>
 *
 * 1. gcc -g -O0  compile the source
 * 2. nm           extract all symbols + addresses
 * 3. size         get .text / .data / .bss sizes
 * 4. Emit JSON to stdout
 *
 * No /proc, no ptrace, no live process — works on macOS out of the box.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define MAX_SYMS 4096
#define LBUF     2048

typedef struct { char addr[32]; char type; char name[256]; } Symbol;
typedef struct { char name[64]; unsigned long size; char start[32]; } Segment;

static Symbol  syms[MAX_SYMS];
static int     nsyms = 0;
static Segment segs[16];
static int     nsegs = 0;

static void json_esc(const char *in, char *out, int len) {
    int j = 0;
    for (int i = 0; in[i] && j < len-3; i++) {
        unsigned char c = (unsigned char)in[i];
        if (c == '"')  { out[j++]='\\'; out[j++]='"';  continue; }
        if (c == '\\') { out[j++]='\\'; out[j++]='\\'; continue; }
        if (c == '\n') { out[j++]='\\'; out[j++]='n';  continue; }
        if (c < 0x20)  continue;
        out[j++] = in[i];
    }
    out[j] = '\0';
}

static const char *seg_for(char t) {
    switch(t) {
        case 'T': case 't': return "text";
        case 'D': case 'd': return "data";
        case 'B': case 'b': return "bss";
        case 'R': case 'r': return "rodata";
        case 'W': case 'w': return "weak";
        default:            return "other";
    }
}

/* macOS nm prefixes C symbols with _; strip it for display */
static const char *strip_(const char *s) {
    return (s[0]=='_' && s[1]!='_') ? s+1 : s;
}

static int skip_sym(const char *raw) {
    if (raw[0]=='_' && raw[1]=='_') return 1;
    const char *noise[] = {
        "_init","_fini","_start","deregister_tm","register_tm",
        "frame_dummy","__do_global","completed.","_ITM_",
        "call_weak_fn","dyld_stub_binder","__mh_execute_header",
        "__dso_handle","__data_start","data_start","_edata","_end",
        "_DYNAMIC","_GLOBAL_OFFSET_TABLE_","_IO_stdin_used",
        "deregister_tm_clones","register_tm_clones",NULL
    };
    for (int i = 0; noise[i]; i++)
        if (strcmp(raw, noise[i])==0 || strcmp(strip_(raw), noise[i]+(*noise[i]=='_'?0:0))==0)
            return 1;
    /* also skip _DYNAMIC style linker syms */
    const char *prefixes[] = {"__GNU","__FRAME","__frame","__abi",
                               "_DYNAMIC","_GLOBAL","_IO_","completed.",NULL};
    for (int i = 0; prefixes[i]; i++)
        if (strncmp(raw, prefixes[i], strlen(prefixes[i]))==0) return 1;
    return 0;
}

static void collect_symbols(const char *bin) {
    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "nm --defined-only -n \"%s\" 2>/dev/null", bin);
    FILE *fp = popen(cmd, "r");
    if (!fp) return;
    char line[LBUF];
    while (fgets(line, sizeof(line), fp) && nsyms < MAX_SYMS) {
        char raw_addr[32], raw_name[256]; char type;
        if (sscanf(line, "%31s %c %255s", raw_addr, &type, raw_name) != 3) continue;
        if (type=='A'||type=='a'||type=='U'||type=='u') continue;
        if (skip_sym(raw_name)) continue;
        const char *name = strip_(raw_name);
        if (skip_sym(name)) continue;
        strncpy(syms[nsyms].addr, raw_addr, 31);
        syms[nsyms].type = type;
        strncpy(syms[nsyms].name, name, 255);
        nsyms++;
    }
    pclose(fp);
}

static void collect_segments(const char *bin) {
    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "size \"%s\" 2>/dev/null", bin);
    FILE *fp = popen(cmd, "r");
    if (!fp) return;
    char line[LBUF];
    int header = 0;
    while (fgets(line, sizeof(line), fp)) {
        if (!header) { header=1; continue; } /* skip header */
        unsigned long text=0, data=0, bss=0;
        if (sscanf(line, "%lu %lu %lu", &text, &data, &bss) == 3) {
            if (text) { strcpy(segs[nsegs].name,".text");  segs[nsegs].size=text; nsegs++; }
            if (data) { strcpy(segs[nsegs].name,".data");  segs[nsegs].size=data; nsegs++; }
            if (bss)  { strcpy(segs[nsegs].name,".bss");   segs[nsegs].size=bss;  nsegs++; }
        }
        break;
    }
    pclose(fp);
    /* fill start addresses from lowest symbol in each segment */
    for (int i = 0; i < nsegs; i++) {
        char st = ' ';
        if (!strcmp(segs[i].name,".text"))   st='T';
        if (!strcmp(segs[i].name,".data"))   st='D';
        if (!strcmp(segs[i].name,".bss"))    st='B';
        if (!strcmp(segs[i].name,".rodata")) st='R';
        unsigned long long best = 0xFFFFFFFFFFFFFFFFULL;
        for (int j = 0; j < nsyms; j++) {
            char t = syms[j].type;
            if (t==st || t==(st+32)) {
                unsigned long long a = strtoull(syms[j].addr,NULL,16);
                if (a < best) best = a;
            }
        }
        if (best != 0xFFFFFFFFFFFFFFFFULL)
            snprintf(segs[i].start, sizeof(segs[i].start), "0x%016llx", best);
        else
            strcpy(segs[i].start, "?");
    }
}

int main(int argc, char *argv[]) {
    if (argc < 2) { fprintf(stderr,"usage: memvis_backend <source.c>\n"); return 1; }

    char binary[512];
    snprintf(binary, sizeof(binary), "/tmp/memvis_%d", (int)getpid());

    /* compile */
    char ccmd[2048];
    snprintf(ccmd, sizeof(ccmd), "gcc -g -O0 -o \"%s\" \"%s\" 2>&1", binary, argv[1]);
    char cerr[8192]="";
    FILE *cp = popen(ccmd,"r");
    if (cp) {
        size_t n = fread(cerr,1,sizeof(cerr)-1,cp); cerr[n]='\0';
        if (pclose(cp) != 0) {
            char esc[16384]; json_esc(cerr,esc,sizeof(esc));
            printf("{\"error\":\"%s\"}\n",esc);
            return 1;
        }
    }

    collect_symbols(binary);
    collect_segments(binary);
    unlink(binary);

    /* emit JSON */
    printf("{\n  \"symbols\": [\n");
    for (int i=0; i<nsyms; i++) {
        char en[512]; json_esc(syms[i].name,en,sizeof(en));
        printf("    {\"addr\":\"0x%s\",\"type\":\"%c\",\"segment\":\"%s\",\"name\":\"%s\"}%s\n",
               syms[i].addr, syms[i].type, seg_for(syms[i].type), en,
               i<nsyms-1?",":"");
    }
    printf("  ],\n  \"segments\": [\n");
    for (int i=0; i<nsegs; i++) {
        printf("    {\"name\":\"%s\",\"size\":%lu,\"start\":\"%s\"}%s\n",
               segs[i].name, segs[i].size, segs[i].start,
               i<nsegs-1?",":"");
    }
    printf("  ]\n}\n");
    return 0;
}

# memvis — build the C backend
CC     = gcc
CFLAGS = -O2 -Wall
TARGET = backend/memvis_backend

.PHONY: all clean

all: $(TARGET)

$(TARGET): backend/memvis_backend.c
	$(CC) $(CFLAGS) -o $(TARGET) backend/memvis_backend.c

clean:
	rm -f $(TARGET)

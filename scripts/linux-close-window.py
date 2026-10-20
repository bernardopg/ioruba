"""Send the standard WM_DELETE_WINDOW message on the isolated X11 test display."""
import ctypes as c
import sys

class ClientMessage(c.Structure):
    _fields_ = [("type", c.c_int), ("serial", c.c_ulong), ("send_event", c.c_int),
                ("display", c.c_void_p), ("window", c.c_ulong),
                ("message_type", c.c_ulong), ("format", c.c_int), ("data", c.c_long * 5),
                ("padding", c.c_long * 12)]

x = c.CDLL("libX11.so.6")
x.XOpenDisplay.restype = c.c_void_p
x.XInternAtom.argtypes = [c.c_void_p, c.c_char_p, c.c_int]
x.XInternAtom.restype = c.c_ulong
x.XSendEvent.argtypes = [c.c_void_p, c.c_ulong, c.c_int, c.c_long, c.c_void_p]
x.XFlush.argtypes = [c.c_void_p]
x.XCloseDisplay.argtypes = [c.c_void_p]
display = x.XOpenDisplay(None)
assert display, "X11 display unavailable"
window = int(sys.argv[1])
event = ClientMessage(33, 0, 1, display, window, x.XInternAtom(display, b"WM_PROTOCOLS", 0), 32,
                      (c.c_long * 5)(x.XInternAtom(display, b"WM_DELETE_WINDOW", 0), 0, 0, 0, 0))
assert x.XSendEvent(display, window, 0, 0, c.byref(event)), "Close event delivery failed"
x.XFlush(display)
x.XCloseDisplay(display)

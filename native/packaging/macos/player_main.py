"""PyInstaller entry point: LuminaScreen.app/Contents/MacOS/LuminaScreen (the player).

`--st-pty-exec` is checked BEFORE the player is imported: it is the remote terminal's shell starter
(luminascreen_native/ptyexec.py), a fresh process that must exec the shell without loading Qt.
"""
import sys

from luminascreen_native.ptyexec import dispatch

if __name__ == "__main__":
    _pty = dispatch(sys.argv)
    if _pty is not None:
        sys.exit(_pty)
    from luminascreen_native.app import main
    sys.exit(main())

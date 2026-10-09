"""PyInstaller entry point: luminascreen-helper.exe (the SYSTEM service + watchdog)."""
from luminascreen_native.winhelper.service import main

if __name__ == "__main__":
    main()

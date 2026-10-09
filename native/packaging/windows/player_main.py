"""PyInstaller entry point: LuminaScreen.exe (the player)."""
import sys

from luminascreen_native.app import main

if __name__ == "__main__":
    sys.exit(main())

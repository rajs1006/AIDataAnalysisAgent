# -*- mode: python ; coding: utf-8 -*-
import os
import sys
import tkinter
from PyInstaller.utils.hooks import collect_system_data_files
from PyInstaller.utils.hooks import collect_dynamic_libs

block_cipher = None

def find_tcltk_files():
    """Find Tcl/Tk files in common Docker/Linux locations"""
    possible_paths = [
        '/usr/local/lib',
        '/usr/lib/tcltk',
        '/usr/share/tcltk',
        '/usr/lib/tcl8.6',
        '/usr/lib/tk8.6',
        '/usr/share/tcltk/tcl8.6',
        '/usr/share/tcltk/tk8.6',
        '/usr/lib/x86_64-linux-gnu',
        '/usr/lib/python3/dist-packages/tkinter',
    ]
    
    tcl_path = None
    tk_path = None
    lib_files = []
    
    for base_path in possible_paths:
        tcl_check = os.path.join(base_path, 'tcl8.6')
        if not tcl_path and os.path.exists(tcl_check):
            tcl_path = tcl_check
        
        tk_check = os.path.join(base_path, 'tk8.6')
        if not tk_path and os.path.exists(tk_check):
            tk_path = tk_check
        
        for lib_name in ['libtcl8.6.so', 'libtk8.6.so']:
            lib_check = os.path.join(base_path, lib_name)
            if os.path.exists(lib_check) and lib_check not in lib_files:
                lib_files.append((lib_check, '.'))
    
    return tcl_path, tk_path, lib_files

# Get Tcl/Tk paths and libraries
tcl_path, tk_path, lib_files = find_tcltk_files()

# Initialize datas list
datas = []

env_path = os.path.join(os.getcwd(), '.env')
print(f"\nLooking for .env at: {env_path}")
if os.path.exists(env_path):
    print(".env file exists!")
    with open(env_path, 'r') as f:
        print("Content of .env file:")
        print(f.read())
else:
    print(".env file not found!")

# Use current directory (where spec file is actually located) for .env file
if os.path.isfile('.env'):
    datas.append(('.env', '.'))
else:
    raise FileNotFoundError(f"Required .env file not found")

# Add Tcl/Tk paths if found
if tcl_path and os.path.exists(tcl_path):
    datas.append((tcl_path, 'tcl8.6'))
if tk_path and os.path.exists(tk_path):
    datas.append((tk_path, 'tk8.6'))

# Add tkinter files
tkinter_path = os.path.dirname(tkinter.__file__)
if os.path.exists(tkinter_path):
    datas.append((tkinter_path, 'tkinter'))

# Configure binaries
binaries = lib_files

hiddenimports = [
    'pathlib', 'datetime', 'hashlib', 'threading', 'time', 'typing',
    'requests', 'queue', 'mimetypes', 'chardet', 'logging.handlers',
    'tkinter', 'tkinter.filedialog', 'tkinter.messagebox', 'tkinter.ttk',
    '_tkinter',
    'watchdog.observers', 'watchdog.events',
    'pdfplumber', 'docx', 'magic', 'PIL', 'PIL.Image', 'pytesseract',
    'dotenv'
]

a = Analysis(
    ['folder.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'flask', 'flask_cors', 'numpy', 'pandas', 'pytest'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False
)

seen = set()
a.datas = [x for x in a.datas if not (tuple(x) in seen or seen.add(tuple(x)))]

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='folder_watcher',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None
)
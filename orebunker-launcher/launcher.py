#!/usr/bin/env python3
"""OreBunker desktop launcher. Standard library only; no bundled engine."""
from __future__ import annotations
import os, sys, shutil, subprocess, pathlib, tkinter as tk
from tkinter import ttk, messagebox, filedialog
ROOT=pathlib.Path(__file__).resolve().parent
HOME=pathlib.Path.home()
DATA=HOME/("Library/Application Support/OreBunker" if sys.platform=="darwin" else ".orebunker")
GAME=ROOT/"game"
MODES={"Survival":"survival","Creative":"creative","ORE Hunt (60s)":"hunt"}

def candidates():
    env=os.environ.get("OREBUNKER_LUANTI")
    if env: yield pathlib.Path(env).expanduser()
    for name in ("luanti","minetest"):
        cmd=shutil.which(name)
        if cmd: yield pathlib.Path(cmd)
    for p in ("/Applications/Luanti.app/Contents/MacOS/luanti",
              "/Applications/Luanti.app/Contents/MacOS/minetest",
              "/Applications/Minetest.app/Contents/MacOS/minetest",
              str(HOME/"Applications/Luanti.app/Contents/MacOS/luanti"),
              "/usr/local/bin/luanti","/opt/homebrew/bin/luanti"):
        yield pathlib.Path(p)

def find_engine():
    for path in candidates():
        if path.is_file() and os.access(path,os.X_OK): return path
    return None

def setup(mode):
    DATA.mkdir(parents=True,exist_ok=True)
    games=DATA/"games";games.mkdir(exist_ok=True)
    dest=games/"orebunker"
    if dest.exists(): shutil.rmtree(dest)
    shutil.copytree(GAME,dest)
    world=DATA/"worlds"/("orebunker_"+mode)
    world.mkdir(parents=True,exist_ok=True)
    (world/"world.mt").write_text("gameid = orebunker\nbackend = sqlite3\n",encoding="utf-8")
    conf=DATA/("orebunker_"+mode+".conf")
    conf.write_text("name = OreBunker\ncreative_mode = "+("true" if mode=="creative" else "false")+
                    "\norebunker_mode = "+mode+"\nserver_announce = false\n",encoding="utf-8")
    return world,conf

def main():
    app=tk.Tk();app.title("OREBUNKER.COM | Luanti Launcher");app.geometry("550x345")
    frame=ttk.Frame(app,padding=22);frame.pack(fill="both",expand=True)
    ttk.Label(frame,text="OREBUNKER",font=("Arial",24,"bold")).pack(anchor="w")
    ttk.Label(frame,text="Native voxel worlds • fictional ORE/Solana mineral blocks").pack(anchor="w",pady=(2,16))
    choice=tk.StringVar(value="Survival")
    ttk.Label(frame,text="Game mode").pack(anchor="w")
    ttk.Combobox(frame,textvariable=choice,values=list(MODES),state="readonly").pack(fill="x",pady=(5,12))
    engine=tk.StringVar(value=str(find_engine() or "Luanti engine not detected"))
    ttk.Label(frame,text="Luanti executable").pack(anchor="w")
    row=ttk.Frame(frame);row.pack(fill="x",pady=(4,10))
    ttk.Entry(row,textvariable=engine).pack(side="left",fill="x",expand=True)
    def browse():
        selected=filedialog.askopenfilename(title="Choose Luanti executable")
        if selected: engine.set(selected)
    ttk.Button(row,text="Browse",command=browse).pack(side="left",padx=(8,0))
    status=tk.StringVar(value="Installs OreBunker into an isolated local data directory.")
    ttk.Label(frame,textvariable=status,wraplength=480).pack(anchor="w",pady=7)
    def run():
        exe=pathlib.Path(engine.get()).expanduser()
        if not exe.is_file() or not os.access(exe,os.X_OK):
            messagebox.showerror("Luanti not found","Install Luanti first, or select its executable.");return
        mode=MODES[choice.get()]
        try:
            world,conf=setup(mode)
            env=os.environ.copy();env["MINETEST_USER_PATH"]=str(DATA)
            args=[str(exe),"--config",str(conf),"--world",str(world),"--go"]
            subprocess.Popen(args,env=env,cwd=str(exe.parent))
            status.set("Started Luanti in "+choice.get()+". Data: "+str(DATA))
        except Exception as e: messagebox.showerror("Launch failed",str(e))
    ttk.Button(frame,text="Launch OreBunker",command=run).pack(fill="x",pady=(8,4))
    ttk.Label(frame,text="Independent community game. No wallet access or real token mining.",
              foreground="#555").pack(anchor="w",pady=(10,0))
    app.mainloop()
if __name__=="__main__":main()

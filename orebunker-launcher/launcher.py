#!/usr/bin/env python3
"""OREBunker.com launcher: focused native Luanti modes and safe companion wallet link."""
from __future__ import annotations
import subprocess,tkinter as tk,webbrowser
from tkinter import ttk,filedialog,messagebox
from modes import MODES,locate_engine,stage
def main():
 root=tk.Tk();root.title("OREBunker.com • Native ORE / SOL Mining");root.geometry("640x465")
 wrap=ttk.Frame(root,padding=22);wrap.pack(fill="both",expand=True)
 ttk.Label(wrap,text="OREBUNKER",font=("Arial",26,"bold")).pack(anchor="w")
 ttk.Label(wrap,text="Mine • Compete • Run Virtual Rigs • Connect a Wallet",font=("Arial",11)).pack(anchor="w",pady=(3,14))
 names=list(MODES)
 chosen=tk.StringVar(value=names[0])
 ttk.Label(wrap,text="Select ORE/SOL game mode").pack(anchor="w")
 picker=ttk.Combobox(wrap,textvariable=chosen,values=names,state="readonly");picker.pack(fill="x",pady=7)
 info=tk.StringVar(value=MODES[names[0]])
 ttk.Label(wrap,textvariable=info,wraplength=590).pack(anchor="w")
 picker.bind("<<ComboboxSelected>>",lambda _:info.set(MODES[chosen.get()]))
 path=tk.StringVar(value=str(locate_engine() or ""))
 ttk.Label(wrap,text="Installed Luanti executable").pack(anchor="w",pady=(16,2))
 row=ttk.Frame(wrap);row.pack(fill="x")
 ttk.Entry(row,textvariable=path).pack(side="left",fill="x",expand=True)
 def browse():
  value=filedialog.askopenfilename(title="Choose Luanti executable")
  if value:path.set(value)
 ttk.Button(row,text="Browse",command=browse).pack(side="left",padx=6)
 status=tk.StringVar(value="Mining scores are fictional. Real wallet actions require separate confirmation.")
 ttk.Label(wrap,textvariable=status,wraplength=590).pack(anchor="w",pady=16)
 def run():
  executable=locate_engine(path.get())
  if executable is None:messagebox.showerror("Engine missing","Install Luanti or select a valid executable.");return
  try:
   world,conf=stage(chosen.get())
   subprocess.Popen([str(executable),"--config",str(conf),"--world",str(world),"--go"],cwd=str(executable.parent))
   status.set("Started "+MODES[chosen.get()]+" using "+str(world))
  except Exception as err:messagebox.showerror("Launch failed",str(err))
 ttk.Button(wrap,text="Launch Native Mining Mode",command=run).pack(fill="x",pady=4)
 ttk.Button(wrap,text="Open ORE / SOL Wallet Companion",command=lambda:webbrowser.open("https://github.com/CodesbyFebin/Ore-Voxel-Mining/tree/feat/orebunker-focused-mining-launcher/orebunker-launcher/wallet")).pack(fill="x",pady=4)
 ttk.Label(wrap,text="Independent community project. Native game never requests wallet secrets.",font=("Arial",9)).pack(anchor="w",pady=12)
 root.mainloop()
if __name__=="__main__":main()

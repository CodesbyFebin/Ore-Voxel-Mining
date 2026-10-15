"""Isolated native worlds for focused ORE / SOL-themed mining modes."""
from pathlib import Path
import os,shutil,sys
ROOT=Path(__file__).resolve().parent
MODES={"ore-quarry":"ORE Quarry","sol-caverns":"SOL Caverns","rig-network":"Mining Rig Network","ore-hunt":"ORE Hunt 60s"}
def data_dir():
 if sys.platform=="darwin": return Path.home()/"Library/Application Support/OREBunker"
 if sys.platform=="win32": return Path(os.environ.get("LOCALAPPDATA",str(Path.home())))/"OREBunker"
 return Path.home()/".local/share/orebunker"
def locate_engine(selected=None):
 names=[selected,os.environ.get("OREBUNKER_LUANTI"),shutil.which("luanti"),shutil.which("minetest"),"/Applications/Luanti.app/Contents/MacOS/luanti","/Applications/Luanti.app/Contents/MacOS/minetest"]
 for x in names:
  if x and Path(x).expanduser().is_file() and os.access(Path(x).expanduser(),os.X_OK):return Path(x).expanduser()
 return None
def stage(mode,base=None):
 if mode not in MODES:raise ValueError("unknown mode")
 base=Path(base) if base else data_dir()
 games=base/"games";games.mkdir(parents=True,exist_ok=True)
 source=ROOT/"game"
 if not (source/"game.conf").is_file():raise FileNotFoundError("OreBunker game not found")
 destination=games/"orebunker"
 shutil.copytree(source,destination,dirs_exist_ok=True)
 world=base/"worlds"/mode;world.mkdir(parents=True,exist_ok=True)
 metadata=world/"world.mt"
 if not metadata.exists(): metadata.write_text("gameid = orebunker\nbackend = sqlite3\n",encoding="utf8")
 config=base/f"{mode}.conf"
 config.write_text("name = OREBunker\nserver_announce = false\norebunker_mode = "+mode+"\n",encoding="utf8")
 return world,config

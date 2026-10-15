-- OREBunker Guide: deterministic in-world assistant. No secret storage or transaction API.
local MOD = minetest.get_current_modname()
local CHAT_FORM = "orebunker_assistant:chat"
local conversations = {}
local MAX_QUERY = 240
local function text(s)
 return minetest.formspec_escape(s)
end
local function response(player, query)
 local q=query:lower()
 local mode=minetest.settings:get("orebunker_mode") or "ore-quarry"
 if q:find("wallet",1,true) or q:find("solana",1,true) or q:find("transaction",1,true) then
  return "For real ORE/SOL transactions use an independently verified wallet companion. Never share a seed phrase, and review network, recipient, amount and fees in your wallet. In-game mining points are not crypto."
 elseif q:find("ore",1,true) or q:find("mine",1,true) or q:find("crystal",1,true) then
  return "Explore below the surface and mine colored crystals with your pickaxe. ORE-themed and SOL-themed minerals are game resources only. Use /obcredits to check local scores."
 elseif q:find("hunt",1,true) or q:find("tournament",1,true) then
  return "In the 60-second Hunt mode, two players use /obready to begin. Mine inside the arena for points. This is a game tournament, not on-chain mining."
 elseif q:find("rig",1,true) or q:find("hash",1,true) then
  return "Use /obrigs for simulated rig capacity and /obupgrade to spend 100 fictional game credits. No real CPU/GPU cryptocurrency mining occurs."
 elseif q:find("navigate",1,true) or q:find("where",1,true) or q:find("lost",1,true) then
  local p=player:get_pos()
  return ("Your position is X %.0f, Y %.0f, Z %.0f. The home landmark is near X 0, Z 0. Keep a safe route back."):format(p.x,p.y,p.z)
 elseif q:find("help",1,true) or q:find("command",1,true) or q=="" then
  return "I can explain mining, ORE Hunt, rigs, your position and wallet safety. Commands: /obassistant, /obcredits, /obrigs, /obupgrade, /obmode."
 end
 return "I can help with ORE mining, SOL caverns, rig upgrades, tournament commands, directions and wallet safety. Try asking: How do I find ORE?"
end
local function show(player, answer)
 local name=player:get_player_name()
 local history=conversations[name] or {}
 if answer then history[#history+1]=answer end
 while #history>5 do table.remove(history,1) end
 conversations[name]=history
 local content=table.concat(history,"\n\n")
 local fs="formspec_version[4]size[11,8]"..
  "label[0.5,0.35;OREBUNKER AI GUIDE]"..
  "textarea[0.5,0.95;10,4.8;answer;;"..text(content).."]"..
  "field[0.5,6;10,0.8;question;Ask about mining, navigation, rigs or safety;]"..
  "button[0.5,7;3,0.75;ask;Ask]"..
  "button[3.7,7;3,0.75;directions;Where am I?]"..
  "button_exit[7.1,7;3,0.75;close;Close]"
 minetest.show_formspec(name,CHAT_FORM,fs)
end
minetest.register_on_player_receive_fields(function(player, form, fields)
 if form~=CHAT_FORM then return false end
 if not player or not player:is_player() then return true end
 if fields.quit and not fields.ask and not fields.directions then return true end
 local q=fields.directions and "where am I" or fields.question or ""
 if #q>MAX_QUERY then show(player,"Question too long (240 character limit)."); return true end
 show(player,response(player,q))
 return true
end)
minetest.register_chatcommand("obassistant",{
 description="Talk to the in-game OreBunker guide NPC",
 func=function(name)
  local player=minetest.get_player_by_name(name)
  if not player then return false,"Player not found" end
  show(player,"Hello! I am your OreBunker guide. What would you like help with?")
  return true,"Assistant opened."
 end
})
minetest.register_entity(MOD..":guide",{
 initial_properties={
  physical=true,collide_with_objects=false,
  collisionbox={-0.28,-1,-0.28,0.28,0.75,0.28},
  visual="cube",
  visual_size={x=0.85,y=1.7},
  textures={"orebunker_guide.png","orebunker_guide.png","orebunker_guide.png",
            "orebunker_guide.png","orebunker_guide.png","orebunker_guide.png"},
  static_save=true
 },
 on_rightclick=function(self,clicker)
  if clicker and clicker:is_player() then
   show(clicker,"Welcome to OreBunker. Ask me about mining, modes, rigs, navigation or wallet safety.")
  end
 end,
 on_punch=function(self,puncher)
  if puncher and puncher:is_player() then
   minetest.chat_send_player(puncher:get_player_name(),"Guide NPC is non-combat. Right-click to talk.")
  end
 end
})
minetest.register_chatcommand("obguide",{
 description="Spawn a personal OreBunker guide nearby (one guide per player)",
 func=function(name)
  local player=minetest.get_player_by_name(name)
  if not player then return false,"Player not found" end
  local p=player:get_pos()
  local key="obguide:"..name
  local previous=player:get_meta():get_string(key)
  if previous~="" then
   local ok,old=pcall(minetest.deserialize,previous)
   if ok and type(old)=="table" and old.x and vector.distance(old,p)<4 then
    return true,"Your guide is already nearby. Use /obassistant."
   end
  end
  p={x=p.x+1,y=p.y+1,z=p.z}
  local obj=minetest.add_entity(p,MOD..":guide")
  if not obj then return false,"Unable to spawn guide at this position" end
  player:get_meta():set_string(key,minetest.serialize(p))
  return true,"Guide spawned. Right-click the guide to talk."
 end
})
minetest.register_on_leaveplayer(function(player) conversations[player:get_player_name()]=nil end)

local mode = minetest.settings:get("orebunker_mode") or "ore-quarry"
local storage=minetest.get_mod_storage()
local node_names={ore="orebunker_core:ore",sol="orebunker_core:solana"}
local function valid(p)
 return p and p:is_player()
end
local function score(name,amount)
 local key="credits:"..name
 storage:set_int(key,storage:get_int(key)+amount)
end
minetest.register_on_dignode(function(pos,oldnode,digger)
 if not valid(digger) then return end
 local name=digger:get_player_name()
 if mode=="ore-quarry" and oldnode.name==node_names.ore then score(name,25)
 elseif mode=="sol-caverns" and oldnode.name==node_names.sol then score(name,25) end
end)
minetest.register_chatcommand("obwallet",{description="Wallet safety instructions",func=function()
 return true,"Wallets connect ONLY through separate HTTPS companion; never type seed phrases into chat or Luanti."
end})
minetest.register_chatcommand("obcredits",{description="Show fictional mining credits",func=function(name)
 return true,"Game credits: "..storage:get_int("credits:"..name).." (not ORE/SOL tokens)"
end})
minetest.register_chatcommand("obrigs",{description="Show virtual hashrate",func=function(name)
 local level=math.max(1,storage:get_int("rig:"..name))
 return true,"Virtual hashrate: "..(100*level).." H/s. No actual mining computation."
end})
minetest.register_chatcommand("obupgrade",{description="Upgrade virtual mining rig with 100 credits",func=function(name)
 local balance=storage:get_int("credits:"..name)
 if balance<100 then return false,"Requires 100 fictional credits" end
 storage:set_int("credits:"..name,balance-100)
 storage:set_int("rig:"..name,math.max(1,storage:get_int("rig:"..name))+1)
 return true,"Virtual rig upgraded."
end})
minetest.register_on_joinplayer(function(player)
 minetest.chat_send_player(player:get_player_name(),"OREBunker mode: "..mode..". Mine ORE / Solana-themed blocks for fictional game credits.")
end)

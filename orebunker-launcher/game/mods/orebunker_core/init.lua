-- Original OreBunker Luanti gameplay module.
local S = minetest.settings
local mode = S:get("orebunker_mode") or "survival"
local storage = minetest.get_mod_storage()
local function node(name, label, color, rarity, points)
  minetest.register_node("orebunker_core:"..name,{
    description=label, tiles={"orebunker_"..name..".png"},
    groups={cracky=2,stone=1},
    drop="orebunker_core:"..name,
    on_dig=function(pos,n,digger)
      if not digger or not digger:is_player() then return minetest.node_dig(pos,n,digger) end
      local player=digger:get_player_name()
      minetest.node_dig(pos,n,digger)
      local state=minetest.deserialize(storage:get_string("arena")) or {}
      if mode~="hunt" or state.phase~="ACTIVE_HUNT" or
         minetest.get_gametime()>= (state.finish or 0) then return end
      local p=state.players and state.players[player]
      if not p then return end
      local o=digger:get_pos()
      if math.abs(o.x)>24 or math.abs(o.z)>24 then return end
      p.score=(p.score or 0)+points
      storage:set_string("arena",minetest.serialize(state))
      minetest.chat_send_all("[OreBunker] "..player.." mined "..label.." (+"..points..")")
    end
  })
  minetest.register_ore({
    ore_type="scatter",ore="orebunker_core:"..name,wherein="mapgen_stone",
    clust_scarcity=rarity,clust_num_ores=3,clust_size=3,y_min=-31000,y_max=-8
  })
end
-- Textures use original simple palette artwork, not third-party trademark images.
node("ore","ORE Emblem Crystal (fictional)",nil,12*12*12,25)
node("solana","Solana Emblem Crystal (fictional)",nil,14*14*14,25)
node("coal","Coal",nil,8*8*8,3)
node("diamond","Diamond",nil,16*16*16,25)
node("stone","Stone",nil,6*6*6,1)

minetest.register_tool("orebunker_core:diamond_pick",{
 description="OreBunker Diamond Pickaxe",inventory_image="orebunker_pick.png",
 tool_capabilities={full_punch_interval=0.7,max_drop_level=3,
  groupcaps={cracky={times={[1]=0.65,[2]=0.35,[3]=0.2},uses=100,maxlevel=3}},
  damage_groups={fleshy=3}}
})
minetest.register_on_newplayer(function(player)
 local inv=player:get_inventory()
 inv:add_item("main","orebunker_core:diamond_pick")
end)
if mode=="creative" then
 minetest.register_on_joinplayer(function(player)
  minetest.chat_send_player(player:get_player_name(),"Creative mode selected in OreBunker launcher.")
 end)
end
local function arena()
 local st=minetest.deserialize(storage:get_string("arena"))
 if type(st)~="table" then st={phase="LOBBY_READY_UP",players={}} end
 if type(st.players)~="table" then st.players={} end
 return st
end
local function persist(st) storage:set_string("arena",minetest.serialize(st)) end
minetest.register_chatcommand("obready",{
 description="Ready up for the 60-second local ORE Hunt",
 func=function(name)
  if mode~="hunt" then return false,"Select ORE Hunt in the launcher." end
  local st=arena()
  if st.phase=="ACTIVE_HUNT" then return false,"Round already active" end
  if st.phase=="POST_ROUND_VERIFICATION" then st={phase="LOBBY_READY_UP",players={}} end
  st.players[name]={ready=true,score=0}
  local count=0;for _ in pairs(st.players) do count=count+1 end
  if count>=2 then
   st.phase="ACTIVE_HUNT";st.finish=minetest.get_gametime()+60
   minetest.chat_send_all("[OreBunker] ORE Hunt begins! 60 seconds; mine within x/z -24..24.")
  end
  persist(st)
  return true,"Ready players: "..count
 end
})
local elapsed=0
minetest.register_globalstep(function(dt)
 if mode~="hunt" then return end
 elapsed=elapsed+dt;if elapsed<1 then return end;elapsed=0
 local st=arena()
 if st.phase~="ACTIVE_HUNT" or minetest.get_gametime()<(st.finish or math.huge) then return end
 st.phase="POST_ROUND_VERIFICATION"
 local winners={};for name,p in pairs(st.players) do winners[#winners+1]={name=name,score=p.score or 0} end
 table.sort(winners,function(a,b) if a.score==b.score then return a.name<b.name end return a.score>b.score end)
 local win=winners[1]
 if win then
  local key="wins_"..win.name;storage:set_int(key,storage:get_int(key)+1)
  minetest.chat_send_all("[OreBunker] Round complete! Winner: "..win.name.." ("..win.score.." points)")
 end
 persist(st)
end)
minetest.register_chatcommand("obscore",{func=function(name)
 local st=arena();local p=st.players[name]
 return true,"Round: "..st.phase.." | Score: "..(p and p.score or 0)..
 " | Wins: "..storage:get_int("wins_"..name)
end})

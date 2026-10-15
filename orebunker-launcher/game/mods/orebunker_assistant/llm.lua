-- Optional local Ollama inference; registered as a narrow chat service.
local M={}
local settings=minetest.settings
local enabled=settings:get_bool("orebunker_ai_enabled",false)
local endpoint="http://127.0.0.1:11434/api/chat"
local model=settings:get("orebunker_ai_model") or "llama3.2:3b"
local http=enabled and minetest.request_http_api() or nil
local pending={}
local next_id=0
local function safe(s,limit)
 s=tostring(s or ""):gsub("[%z\1-\8\11\12\14-\31]"," ")
 return s:sub(1,limit)
end
function M.available() return enabled and http~=nil end
function M.ask(player,question,callback)
 if not M.available() then callback(nil,"Local AI disabled or HTTP permission missing");return end
 local name=player:get_player_name()
 if pending[name] then callback(nil,"Previous answer still pending");return end
 next_id=next_id+1
 local request_id=next_id
 pending[name]=request_id
 local p=player:get_pos()
 local prompt="You are OREBunker Guide, a friendly non-player character in a Luanti mining game. "..
 "Explain fictional ORE/SOL voxel minerals, rigs, exploration, player navigation and safe play. "..
 "Game mining credits are not crypto and you have no wallet signing abilities. "..
 "Never request secrets, seed phrases or passwords. Never claim a transfer or mining payout occurred. "..
 "You cannot execute world actions, dig or move the player. Keep responses under 90 words."
 local payload=minetest.write_json({model=model,stream=false,options={num_predict=130,temperature=0.3},
 messages={{role="system",content=prompt},
 {role="user",content="Mode: "..safe(settings:get("orebunker_mode") or "ore-quarry",32)..
 "; position: "..math.floor(p.x)..","..math.floor(p.y)..","..math.floor(p.z)..
 "; question: "..safe(question,240)}}})
 http.fetch({url=endpoint,method="POST",data=payload,
  extra_headers={"Content-Type: application/json"},timeout=8},function(result)
  if pending[name]~=request_id then return end
  pending[name]=nil
  if not result or not result.succeeded or result.code~=200 then
   callback(nil,"Local model unavailable");return
  end
  local ok,parsed=pcall(minetest.parse_json,result.data or "")
  if not ok or type(parsed)~="table" or type(parsed.message)~="table" or
     type(parsed.message.content)~="string" then callback(nil,"Invalid model response");return end
  callback(safe(parsed.message.content,700),nil)
 end)
end
function M.clear(name) pending[name]=nil end
return M

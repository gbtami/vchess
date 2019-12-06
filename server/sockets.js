const url = require('url');

// Node version in Ubuntu 16.04 does not know about URL class
function getJsonFromUrl(url)
{
  const query = url.substr(2); //starts with "/?"
  let result = {};
  query.split("&").forEach((part) => {
    const item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}

module.exports = function(wss) {
  let clients = {}; //associative array sid --> socket
  wss.on("connection", (socket, req) => {
    const query = getJsonFromUrl(req.url);
    const sid = query["sid"];
    // TODO: later, allow duplicate connections (shouldn't be much more complicated)
    if (!!clients[sid])
      return socket.send(JSON.stringify({code:"duplicate"}));
    clients[sid] = {sock: socket, page: query["page"]};
    const notifyRoom = (page,code) => {
      Object.keys(clients).forEach(k => {
        if (k != sid && clients[k].page == page)
          clients[k].sock.send(JSON.stringify({code:code,sid:sid}));
      });
    };
    notifyRoom(query["page"],"connect");
    socket.on("message", objtxt => {
      let obj = JSON.parse(objtxt);
      if (!!obj.target && !clients[obj.target])
        return; //receiver not connected, nothing we can do
      switch (obj.code)
      {
        case "pollclients":
          const curPage = clients[sid].page;
          socket.send(JSON.stringify({code:"pollclients",
            sockIds: Object.keys(clients).filter(k =>
              k != sid && clients[k].page == curPage)}));
          break;
        case "pagechange":
          notifyRoom(clients[sid].page, "disconnect");
          clients[sid].page = obj.page;
          notifyRoom(obj.page, "connect");
          break;
        case "askidentity":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"askidentity",from:sid}));
          break;
        case "askchallenge":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"askchallenge",from:sid}));
          break;
        case "askgame":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"askgame",from:sid}));
          break;
        case "identity":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"identity",user:obj.user}));
          break;
        case "refusechallenge":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"refusechallenge", cid:obj.cid, from:sid}));
          break;
        case "deletechallenge":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"deletechallenge", cid:obj.cid, from:sid}));
          break;
        case "newgame":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"newgame", gameInfo:obj.gameInfo, cid:obj.cid}));
          break;
        case "challenge":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"challenge", chall:obj.chall, from:sid}));
          break;
        case "game":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"game", game:obj.game, from:sid}));
          break;
        case "newchat":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"newchat",msg:obj.msg}));
          break;
        // TODO: WebRTC instead in this case (most demanding?)
        case "newmove":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"newmove",move:obj.move}));
          break;
        case "lastate":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"lastate", state:obj.state}));
          break;
        case "resign":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"resign"}));
          break;
        case "abort":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"abort",msg:obj.msg}));
          break;
        case "drawoffer":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"drawoffer"}));
          break;
        case "draw":
          clients[obj.target].sock.send(JSON.stringify(
            {code:"draw"}));
          break;
      }
    });
    socket.on("close", () => {
      const page = clients[sid].page;
      delete clients[sid];
      notifyRoom(page, "disconnect");
    });
  });
}

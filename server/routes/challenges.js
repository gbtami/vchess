// AJAX methods to get, create, update or delete a challenge

let router = require("express").Router();
const access = require("../utils/access");
const ChallengeModel = require("../models/Challenge");
const UserModel = require("../models/User"); //for name check

router.delete("/testtest", access.ajax, (req,res) => {
  console.log("passag");
  ChallengeModel.testfunc();
});

router.post("/challenges", access.logged, access.ajax, (req,res) => {
  const error = ChallengeModel.checkChallenge(req.body.chall);
  if (!!error)
    return res.json({errmsg:error});
  const challenge =
  {
    fen: req.body.chall.fen,
    timeControl: req.body.chall.timeControl,
    vid: req.body.chall.vid,
    uid: req.userId,
    nbPlayers: req.body.chall.to.length,
  };
  ChallengeModel.create(challenge, (err,lastId) => {
    if (!!err)
      return res.json(err);
    if (!!req.body.chall.to[0])
    {
      UserModel.getByName(req.body.chall.to, (err,users) => {
        if (!!err)
          return res.json(err);
        if (users.length < req.body.chall.to.length)
          return res.json({errmsg: "Typo in player(s) name(s)"});
        ChallengeModel.initializeWillPlay(
          users.map(u => u.id),
          lastId["rowid"],
          (err) => {
            if (!!err)
              return res.json(err);
            res.json({cid: lastId["rowid"]});
          }
        );
      });
    }
    else
      res.json({cid: lastId["rowid"]});
  });
});

//// index
//router.get("/challenges", access.logged, access.ajax, (req,res) => {
//  if (req.query["uid"] != req.user._id)
//    return res.json({errmsg: "Not your challenges"});
//  let uid = ObjectID(req.query["uid"]);
//  ChallengeModel.getByPlayer(uid, (err, challengeArray) => {
//    res.json(err || {challenges: challengeArray});
//  });
//});
//
//function createChallenge(vid, from, to, res)
//{
//  ChallengeModel.create(vid, from, to, (err, chall) => {
//    res.json(err || {
//      // A challenge can be sent using only name, thus 'to' is returned
//      to: chall.to,
//      cid: chall._id
//    });
//  });
//}

router.delete("/challenges", access.logged, access.ajax, (req,res) => {
  const cid = req.query.cid;
  ChallengeModel.remove(cid, req.userId, err => {
    res.json(err || {});
  });
});

module.exports = router;

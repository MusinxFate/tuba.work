const moment = require('moment')
const mongo = require('./mongo')
const fs = require('fs')
const getSize = require('get-folder-size')

let nav = ["chat", "player", "shooter", "notes", "webcam_face_detection", "hibo"]

exports.default = (req, res) =>{
  let now = moment();
	res.render('default', {title: 'Default', user: req.session.user});
	console.log(req.ip+" "+now.format('DD/MM/YYYY HH:mm:ss')+' default');
}

exports.home = (req, res) => {
  let date = new Date();
	let visit = {ip: req.ip, date: date.getTime(), user: req.session.user};
	let data = {};
	
	if(req.session.verified || req.session.user){
		data.title = 'Dashboard';
		data.nav = nav;
		data.user = req.session.user;
		res.render('dashboard', data);
		visit.page = "dashboard";
	}/*else if(req.session.user){
		data.title = 'Verify';
		data.user = req.session.user;
		data.email = req.session.email;
		res.render('verify', data);
		visit.page = "verify";
	}*/else{
		data.title = 'Home';
		res.render('home', data);
		visit.page = "home";
	}
	mongo.saveRecord('visits', visit);
}

exports.profile = (req, res) => {
  let date = new Date();
	let visit = {ip: req.ip, date: date.getTime(), user: req.session.user, page: "profile"};
	let data = {};
	data.title = 'Profile', data.user = req.session.user
	mongo.getUserInfo(req.session.user, (err, resp)=>{
		if(err){console.log(err)}else{
			data.userinfo = resp;
			res.render("profile", data);
			mongo.saveVisit(visit);
		}
	});
}

exports.login = (req, res) =>{
  let date = new Date();
	let visit = {ip: req.ip, date: date.getTime(), user: req.session.user};
	
	mongo.existUser(req.body.username, (exist) => {
		if(exist){
			mongo.auth(req.body.username, req.body.password, (success) => {
				if(success){
					req.session.user = req.body.username
					req.session.email = exist.email
					req.session.verified = true
          if(req.body.url == "login"){
            res.redirect("home")
          }else{
            res.redirect(req.body.url);
            //console.log(req.body.url)
          }
				}else{
					res.render('home', {title: 'Home', msg: 'Wrong password'})
				}
			});
		}else{
			res.render('home', {title: 'Home', msg: 'User don\'t exists'})
		}
	});
	visit.page = "login"
	mongo.saveRecord('visits', visit)
}

exports.logout = (req, res) =>{
  let date = new Date();
	let visit = {ip: req.ip, date: date.getTime(), user: req.session.user, page: "about"};
	req.session.destroy();
	res.redirect('/home');
	mongo.saveRecord('visits', visit);
}

exports.signup = (req, res) =>{
  let now = moment();

	mongo.existUser(req.body.username, (exist) => {
		if(exist){
			res.render('home', {title: 'home', msg: 'User already exists'});
		}else{
      console.log(req.body.username)
			mongo.addUser(req.body.username, req.body.password, req.body.email, (success) => {
				if(success){
					req.session.user = req.body.username;
					req.session.email = req.body.email;
          res.redirect('/auth?id='+success.ops[0]._id);
				}else{
					res.render('home', {title: 'home', msg: 'User not registred'});
				}
			});
		}
	});
	console.log(req.ip+" "+now.format('DD/MM/YYYY HH:mm:ss')+' sigup');
}

exports.auth = (req, res) =>{
  if(req.query.id){
		mongo.existId(req.query.id, record => {
			if(record){
				req.session.verified = true;
				record.verified = true;
				mongo.updateRecord('users', {_id: record._id}, record, resp => {
					if(resp){
						let dir = __dirname+'/public/users/'+record.username;
						if (!fs.existsSync(dir)){fs.mkdirSync(dir, { recursive: true });}
						res.redirect('/');
					}
				});
			}
		});
	}else{
		mongo.setEmail({user: req.session.user, email: req.query.email}, resp => {
			if(resp){
				otherEmail = true;
				req.session.email = req.query.email;
				mongo.existUser(req.session.user, exist => {
					if(exist) res.redirect('/auth?id='+exist._id);
				});
			}
		});
	}
}

exports.dashboard = (req, res) =>{
	let data = {};
	let date = new Date();
	let visit = {ip: req.ip, date: date.getTime(), user: req.session.user};
	
	if(req.session.verified || req.session.user){
		data.title = 'Dashboard';
		data.user = req.session.user;
		data.nav = nav;
		res.render('dashboard', data);
		visit.page = "dashboard";
	}/*else if(req.session.user){
		data.title = 'Verify';
		data.user = req.session.user;
		data.email = req.session.email;
		if(otherEmail){
			otherEmail = false;
			data.msg = "Email changed ~";
		}
		res.render('verify', data);
		visit.page = "verify";
	}*/else{
		data.title = 'Home';
		res.render('home', data);
		visit.page = "home";
	}
	mongo.saveRecord('visits', visit);
}

exports.player = (req, res) =>{
  let dir = __dirname+'/public/users/'+req.session.user;
	let date = new Date();
	let data = {};
	let visit = {ip: req.ip, date: date.getTime(), user: req.session.user, page: "player"};
	
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  
	getSize(dir, (err, folder_size) => {
		if (err) { console.log(err);
		}else{
			fs.readdir(dir, (err, files) =>{
				if(err) throw err;
				data.musics = files
        data.size = (folder_size/1024/1024).toFixed(2)
				data.user = req.session.user
        data.title = 'Player'
				res.render('player', data);
				mongo.saveRecord('visits' , visit);
			});
		}
	});
}

exports.notes = (req, res) =>{
	let data = {};
	let date = new Date();
	let visit = {ip: req.ip, date: date.getTime(), user: req.session.user, page: "notes"};
	data.title = 'Notes', data.user = req.session.user, data.nav = nav
	mongo.takeNotes(req.session.user, (err, docs) => {
		if(!docs){res.render('notes', data);}else{
			if(docs){
				data.notes = docs;
				res.render('notes', data);
			}else{
				res.render('notes', data);
			}
		}
	});
	mongo.saveRecord('visits', visit);
}

exports.chat = (req, res) =>{
	let now = moment();
	let date = new Date();
	let visit = {ip: req.ip, date: date.getTime(), user: req.session.user, page: "chat"};
	let data = {ip: req.ip, title: 'Chat'};
	if(req.session.user != null){
		data.user = req.session.user;
	}
	if(req.params.room){
		data.room = req.params.room;
	}
	res.render('chat', data);
	mongo.saveRecord('visits', visit);
}

exports.shooter = (req, res) =>{
  let now = moment();
	res.render('shooter', {title: 'Shooter', user: req.session.user});
	console.log(req.ip+" "+now.format('DD/MM/YYYY HH:mm:ss')+' shooter');
}

// API CODE

exports.songs = async (req, res) => {
  let date = new Date();
	let visit = {ip: req.ip, date: date.getTime(), user: req.me.username, page: "songs"};
  let dir = __dirname+'/public/users/'+req.me.username;
  //let songs = 
      
  if (!fs.existsSync(dir)) {
    res.status(404).send(`User ${req.me.username} has no songs stored in the server!`)
  }else{
    fs.readdir(dir, (err, files) =>{
      if(err) res.send(`Error: ${err}`)
      else {
        res.json(files)
        mongo.saveVisit(visit)
      }
    })
  }
}

exports.jwt = (req, res) => {
  console.log(req.body)
  mongo.auth(req.body.username, req.body.password, user => {
    if(user){
      const token = jwt.sign({ ...user }, process.env.JWT_KEY);
      res.header("auth-token", token).json({ ok: true, token: token, data: user })
    }else{
      res.json({ok: false, msg: "User not found"})
    }
  })
}


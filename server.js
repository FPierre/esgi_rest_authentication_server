var express     = require('express')
var app         = express()
var bodyParser  = require('body-parser')
var morgan      = require('morgan')
var mongoose    = require('mongoose')

var jwt    = require('jsonwebtoken')
var config = require('./config')
var User   = require('./app/models/user')

// Configuration

// Serveur sur le port 8080
var port = process.env.PORT || 8080

mongoose.connect(config.database)
app.set('superSecret', config.secret)

// Parser de requetes HTTP
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Log des actions du serveur
app.use(morgan('dev'))

// Routes

// Route de remplissage de la DB
app.get('/setup', function (req, res) {
  // Création d'un Utilisateur
  var myself = new User({
    login: 'pflauder@gmail.com',
    password: 'root'
  })

  myself.save(function (err) {
    if (err) {
      throw err
    }

    console.log('User saved successfully')

    res.json({ success: true })
  })
})

var apiRoutes = express.Router()

// Routes d'authentification
apiRoutes.post('/authenticate', function (req, res) {
  User.findOne({
    login: req.body.login
  }, function (err, user) {
    if (err) {
      throw err
    }

    if (user) {
      if (user.password != req.body.password) {
        res.json({ success: false, message: 'Authentication failed. Wrong password.' })
      }
      else {
        // Création d'un token
        var token = jwt.sign(user, app.get('superSecret'), {
          expiresIn: 86400 // 24h
        })

        res.json({
          success: true,
          message: 'Enjoy your token!',
          token: token
        })
      }
    }
    else {
      res.json({ success: false, message: 'Authentication failed. User not found.' })
    }
  })
})

// Gestion de l'authentification
apiRoutes.use(function (req, res, next) {
  var token = req.body.token || req.param('token') || req.headers['x-access-token']

  if (token) {
    jwt.verify(token, app.get('superSecret'), function (err, decoded) {
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' })
      }
      else {
        req.decoded = decoded
        next()
      }
    })
  }
  else {
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    })
  }
})

apiRoutes.get('/', function (req, res) {
  res.json({ message: 'Welcome to the coolest API on earth!' })
})

// Routes montées sur /api
app.use('/api', apiRoutes)

var apiRoutes = express.Router()

app.listen(port)

console.log('Magic happens at http://localhost:' + port)

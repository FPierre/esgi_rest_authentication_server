var express     = require('express')
var app         = express()
var bodyParser  = require('body-parser')
var morgan      = require('morgan')
var mongoose    = require('mongoose')

var jwt    = require('jsonwebtoken')
var config = require('./config')
var User   = require('./app/models/user')

// Configuration

var port = process.env.PORT || 8080

mongoose.connect(config.database)
app.set('superSecret', config.secret)

// Use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Use morgan to log requests to the console
app.use(morgan('dev'))

// Routes

app.get('/setup', function (req, res) {
  // Create a sample user
  var myself = new User({
    email: 'pflauder@gmail.com',
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

// Authentication (no middleware necessary since this isnt authenticated)
apiRoutes.post('/authenticate', function (req, res) {
  User.findOne({
    email: req.body.email
  },function (err, user) {
    if (err) {
      throw err
    }

    if (user) {
      // Check if password matches
      if (user.password != req.body.password) {
        res.json({ success: false, message: 'Authentication failed. Wrong password.' })
      }
      else {
        // Create a token
        var token = jwt.sign(user, app.get('superSecret'), {
          expiresIn: 86400 // expires in 24 hours
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

// Route middleware to authenticate and check token
apiRoutes.use(function (req, res, next) {
  // check header or url parameters or post parameters for token
  var token = req.body.token || req.param('token') || req.headers['x-access-token']

  // Decode token
  if (token) {
    // Verifies secret and checks exp
    jwt.verify(token, app.get('superSecret'), function (err, decoded) {
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' })
      }
      else {
        // If everything is good, save to request for use in other routes
        req.decoded = decoded
        next()
      }
    })
  }
  else {
    // If there is no token
    // return an error
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    })
  }
})

// Authenticated routes
apiRoutes.get('/', function (req, res) {
  res.json({ message: 'Welcome to the coolest API on earth!' })
})

apiRoutes.get('/users', function (req, res) {
  User.find({}, function (err, users) {
    res.json(users)
  })
})

apiRoutes.get('/check', function (req, res) {
  res.json(req.decoded)
})

app.use('/api', apiRoutes)

// Get an instance of the router for api routes
var apiRoutes = express.Router()

app.listen(port)

console.log('Magic happens at http://localhost:' + port)

const express = require('express')
const mongoose = require('mongoose')
const app = express()
const cors = require('cors')
require('dotenv').config()
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = new mongoose.Schema({
  username: {type: String, required: true}
});

const exerciseSchema = new mongoose.Schema({
  userid: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});


const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', express.urlencoded({extended: false}), async (req, res) => {
  const username = req.body.username;
  const newUser = new User({username});
  const savedUser = await newUser.save();
  res.json({username: savedUser.username, _id: savedUser._id});
});

app.get('/api/users', async(req, res) => {
  const users = await User.find({}, '_id username');
  res.json(users); 
});

app.post('/api/users/:_id/exercises', express.urlencoded({ extended: false }), async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exercise = new Exercise({
      userid: userId,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Base filter using correct field 'userid'
    const filter = { userid: userId };

    // Date filtering
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    // Fetch exercises with filter and limit
    const exercises = await Exercise.find(filter).limit(parseInt(limit) || 500);

    // Format the log
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    // Final response
    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log: log
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

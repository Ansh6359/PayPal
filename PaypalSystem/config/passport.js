const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function (passport) {
  passport.use(new LocalStrategy((username, password, done) => {
    User.findOne({ where: { username } }).then(user => {
      if (!user) {
        return done(null, false, { message: 'Incorrect username or password.' });
      }

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) return done(err);
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect username or password.' });
        }
        return done(null, user);
      });
    }).catch(err => done(err));
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    User.findByPk(id).then(user => {
      done(null, user);
    }).catch(err => done(err));
  });
};

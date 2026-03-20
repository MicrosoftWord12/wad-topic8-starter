import ViteExpress from 'vite-express';
import express from 'express';
import expressSession from "express-session"
import betterSqlite3Session from "express-session-better-sqlite3";
import Database from 'better-sqlite3';

const app = express();
const PORT = 3000;

app.use(express.json());

const db = new Database("wadsongs.db");

const sessionStore = new Database("sessions.db");

const sqliteStore = betterSqlite3Session(expressSession, sessionStore);

app.use(expressSession({
    // Specify the session store to be used.
    store: new sqliteStore(), 

    // a secret used to digitally sign session cookie, use something unguessable (e.g. random bytes as hex)
    // in a real application.
    secret: 'BinnieAndClyde', 

    // see the documentation for more details, the value you should set it to depends on the inner workings of your session store.
    // For express-session-better-sqlite3, it should be true.
    resave: true, 

    // saves session to store before data is stored in the session 
    // (disabled as this unnecessarily saves empty sessions in the database)
    saveUninitialized: false, 

    // reset cookie for every HTTP response.
    // The cookie expiration time will be reset, to 'maxAge' milliseconds beyond the time of the response.
    // Thus, the session cookie will expire after 10 mins of inactivity
    // (no HTTP request made and consequently no response sent) when 'rolling' is true.
    // If 'rolling' is false, the session cookie would expire after 10 minutes even if the user was active, 
    // which would be very annoying - so true is the sensible setting.
    rolling: true, 

    // destroy session (remove it from the data store) when it is set to null, deleted etc
    unset: 'destroy', 

    // useful if using a proxy to access your server, as you will probably be doing in a production environment: 
    // this allows the session cookie to pass through the proxy
    proxy: true, 

    // properties of session cookie
    cookie: { 
        maxAge: 600000, // 600000 ms = 10 mins expiry time
        httpOnly: false // allow client-side code to access the cookie, otherwise it's kept to the HTTP messages
    }
}));

app.post("/login", (req, res, next) => {
    next()

}, (req, res) => {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM ht_users WHERE username=? AND password=?').get(username, password);

    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    req.session.username = username;
    req.session.password = password;
    res.status(200).json({ success: true });
})

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if(err) {
            res.status(500).json({ success: false, message: "Logout failed" });
            return
        }

        res.status(200).json({ success: true });
    })
})

app.get("/login", (req, res) => {
    if(req.session.username) {
        res.json({ loggedIn: true, username: req.session.username });
    }

    res.json({ loggedIn: false });
})

// Search by artist
app.get('/artist/:artist', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM wadsongs WHERE artist=?');
        const results = stmt.all(req.params.artist);
        res.json(results);
    } catch(error) {
        res.status(500).json({error: error});
    }
});

// Search by title
app.get('/title/:title', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM wadsongs WHERE title=?');
        const results = stmt.all(req.params.title);
        res.json(results);
    } catch(error) {
        res.status(500).json({error: error});
    }
});

// Search by title and artist
app.get('/artist/:artist/title/:title', (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM wadsongs WHERE title=? AND artist=?');
        const results = stmt.all(req.params.title, req.params.artist);
        res.json(results);
    } catch(error) {
        res.status(500).json({error: error});
    }
});

// Buy a song with a given ID
app.post('/song/:id/buy', (req, res) => {
    try {
        const stmt = db.prepare('UPDATE wadsongs SET quantity=quantity-1 WHERE id=?');
        const info = stmt.run(req.params.id);
        const didUpdate = info.changes == 1;
        res.status(didUpdate ? 200 : 404).json({success: didUpdate, id: req.params.id});
    } catch(error) {
        res.status(500).json({error: error});
    }
});

// Delete a song with a given ID
app.delete('/song/:id', (req, res) => {
    try {
        const stmt = db.prepare('DELETE FROM wadsongs WHERE id=?');
        const info = stmt.run(req.params.id);
        const didDelete = info.changes == 1;
        res.status(didDelete ? 200 : 404).json({success: didDelete});
    } catch(error) {
        res.status(500).json({error: error});
    }
});

// Add a song
app.post('/song/create', (req, res) => {
    try {
        const stmt = db.prepare('INSERT INTO wadsongs(title,artist,year,downloads,price,quantity) VALUES(?,?,?,0,?,?)');
        const info = stmt.run(req.body.title, req.body.artist, req.body.year, req.body.price, req.body.quantity);
        res.json({id: info.lastInsertRowid});
    } catch(error) {
        res.status(500).json({error: error});
    }
});

ViteExpress.listen(app, PORT, () => { 
    console.log(`Server running on port ${PORT}.`);
});
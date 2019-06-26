var sqlite3 = require('sqlite3').verbose();  
var db = new sqlite3.Database('assistant.db');  
  
db.serialize(function() {  
  db.run("CREATE TABLE IF NOT EXISTS notes (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, note TEXT NOT NULL, dateTime INTEGER NOT NULL)");  

  var stmt = db.prepare("INSERT INTO notes (note, dateTime) VALUES (?, datetime('now'))");  
  for (var i = 0; i < 10; i++) {  
    stmt.run(i + "note");
  }  
  stmt.finalize();  

  db.each("SELECT * FROM notes", function(err, row) {  
    console.log("Note : "+row.id, row.note, row.dateTime);  
  }); 
});  
  
db.close(); 

/*CREATE TABLE notes (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    note TEXT NOT NULL,
    dateTime INTEGER NOT NULL 
);

INSERT INTO notes (note, dateTime)
VALUES ("Hello", datetime("now"))*/
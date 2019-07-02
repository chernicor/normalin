require('angular');
require('angular-animate');
require('angular-aria');
var path = require('path');
var app = angular.module('todoApp', []);
const storage = require('electron-json-storage');

//require uikit
const UIkit = require("uikit");
const Icons = require('uikit/dist/js/uikit-icons')
UIkit.use(Icons);

var should = require('should');
//var stringify = require('csv-stringify');

//require sql.js
var fs = require('fs');
//var SQL = require('sql.js');

var sqlite3 = require('sqlite3').verbose();
var dbPath = path.resolve(__dirname, 'notebook');
var db = new sqlite3.Database(dbPath);
input = [];

var $ = require('jquery');

/*
для экспорта в csv
function logCSV() {
	stringify(input, function(err, output){
  console.log(output);
});
}*/

//for zero in dates
Number.prototype.padLeft = function(base,chr){
    var  len = (String(base || 10).length - String(this).length)+1;
    return len > 0? new Array(len).join(chr || '0')+this : this;
}

db.serialize(function() {
  db.run(`CREATE TABLE IF NOT EXISTS notes (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		text text,
		createdon integer,
		editedon integer,
		deleted tinyint(1)
	);`);
  /*
  var stmt = db.prepare("INSERT INTO notes VALUES (null,$text,$createdon,$editedon,0)");
  for (var i = 0; i < 10; i++) {
      stmt.run({
          $text: 'Ipsum' +i,
		  $createdon: Date.now(),
		  $editedon: Date.now()
      });
  }
  stmt.finalize();*/

  // for multiple lines
  db.each("SELECT id, text, createdon FROM notes", function(err, row) {
	  //+++console.log(row.id + ": " + row.text + " : "+row.createdon);
	  //для экспорта в csv
	  //input.push([row.id,row.text]);
	  //console.log(input);
  });
  // for solo line
  db.get("SELECT id, text, createdon FROM notes ORDER BY id DESC LIMIT 1", function(err, row) {
      //+++console.log('solo line — '+row.id + ": " + row.text + " : "+row.createdon);
  });
  //logCSV();
});



//global vars
var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


function dbInsertNote(note) {
	let promise = new Promise(function (resolve) {
		db.serialize(function() {
			let sql = "INSERT INTO notes VALUES (null,$text,$createdon,$editedon,0)";
			let stmt = db
 			.prepare(sql)
			.run({
    	      $text: note,
			  $createdon: Date.now(),
			  $editedon: Date.now()
    	  	},err => {
				  console.log('added note with id:', stmt.lastID); 
				  resolve(stmt.lastID);
				});
		});
	});
	return promise;
};
function dbGetNotes(deleted=0) {
	var notes = [];
	let promise = new Promise(function (resolve) {
		db.serialize(function() {
			db.each("SELECT id, text, createdon, editedon FROM notes WHERE deleted="+deleted, function(err, row) {
			    //console.log(row.id + ": " + row.text + " : "+row.createdon);   + " UTC"
				var date = new Date(row.editedon);
				let newnote = {
					'id': row.id,
					'note': row.text.replace(/\n\r?/g, '<br>'),
					'year': date.getFullYear(),
					'dayAndMonth': date.getDate() + " " + monthNames[date.getMonth()],
					'time': date.getHours().padLeft() + ":" + date.getMinutes().padLeft(),
					'dateTime': (+date)
					//(+date)
				};
				notes.push(newnote);
			},function complete(err) {
				console.log('Notes load success');
				resolve(notes);
    		});
		});
	});

	return promise;
};
/*
function dbUpdateNote(id, note) {
	//import db
		var filebuffer = fs.readFileSync('notes.db');
		var db = new SQL.Database(filebuffer);

	//updating note by id
		db.run("UPDATE notes SET note = $note WHERE id = $id", {'$note': note, '$id': id});

	//export
	    var data = db.export();
		var buffer = new Buffer(data);
		fs.writeFileSync("notes.db", buffer);

		return true;
};*/

function group(unsortedNotes) {
	var curYear = (new Date()).getFullYear();
	var notes = [];
	var days = [];

	unsortedNotes.forEach(function(item, i, arr) {
		if (days.indexOf(item.dayAndMonth)>-1) {
			if (item.year == curYear) {
				notes[days.indexOf(item.dayAndMonth)].notes.push({
					'id': item.id,
					'time': item.time,
					'note': item.note
				});
			}
		} else {
			days.push(item.dayAndMonth);
			notes.push({
				'day': item.dayAndMonth,
				'notes': [{
					'id': item.id,
					'time': item.time,
					'note': item.note
				}]
			});
		}
	});
	

	return notes;
};

/*function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};*/

var loadnotes;


app.controller('AppCtrl', ['$scope','$sce', function($scope,$sce) {
	

	$scope.options = {
		name: 'Assistant'
	};
	$scope.savelog = x => {console.log(x); return x};
	$scope.groupNotes = function (unsortedNotes) {
		var curYear = (new Date()).getFullYear();
		var notes = [];
		var days = [];
		unsortedNotes.forEach(function(item, i, arr) {
			if (days.indexOf(item.dayAndMonth)>-1) {
				if (item.year == curYear) {
					notes[days.indexOf(item.dayAndMonth)].notes.unshift({
						'id': item.id,
						'time': item.time,
						'note': $sce.trustAsHtml(item.note)
					});
				}
			} else {
				days.unshift(item.dayAndMonth);
				notes.unshift({
					'day': item.dayAndMonth,
					'notes': [{
						'id': item.id,
						'time': item.time,
						'note': $sce.trustAsHtml(item.note)
					}]
				});
			}
		});
		

		return notes;
	};

	$scope.dbTrashNote = function (id) {
		db.serialize(function() {
			db.get("UPDATE notes SET deleted = 1 WHERE id = "+id, function(err, row) {
				console.log('note with id: '+id+' moved to trash');
				$('div[data-noteid="'+id+'"]').parent().slideUp(275,function() {$(this).remove()});
				$scope.refresh = '';
				$scope.$apply();
			});
		});
			return true;
	};

	$scope.dbDeleteNote = function (id) {
		db.serialize(function() {
			db.get("DELETE FROM notes WHERE id = "+id, function(err, row) {
				console.log('deleted note with id: '+id);
				$('div[data-noteid="'+id+'"]').parent().slideUp(275,function() {$(this).remove()});
				$scope.refresh = '';
				$scope.$apply();
			});
		});
			return true;
	};

	dbGetNotes().then(function(notes) {
		$scope.unsortedNotes = notes;
		$scope.notes = $scope.groupNotes($scope.unsortedNotes);
		console.log($scope.notes);
		$scope.refresh = '';
		$scope.$apply();
	});
	loadnotes = () => {
	dbGetNotes().then(function(notes) {
		$scope.unsortedNotes = notes;
		$scope.notes = $scope.groupNotes($scope.unsortedNotes);
		console.log($scope.notes);
		$scope.refresh = '';
		$scope.$apply();
	});

	dbGetNotes(1).then(function(notes) {
		$scope.unsortedNotes = notes;
		$scope.deletednotes = $scope.groupNotes($scope.unsortedNotes);
		$scope.refresh = '';
		$scope.$apply();
	});
	};

	loadnotes();

	/*dbGetNotes().then($scope.groupNotes);*/

	//var date = new Date($scope.unsortedNotes[0].dateTime);
	//console.log(date.getDate() + " " + monthNames[date.getMonth()]);
	
	//$scope.myNotes = [];

	/*storage.clear(function(error) {
  	if (error) throw error;
	});*/
	/*storage.getAll(function(error, data) {
		if (error) throw error;
		var allnotes = [];
		for (var key in data) {
	  	if (data.hasOwnProperty(key)) {
				console.log(data[key]);
	  	  allnotes.push(data[key]);
	  	}
		}
		$scope.myNotes = allnotes;
		console.log($scope.myNotes);
		console.log(allnotes);
		$scope.$apply();
  	//console.log(data);
	});*/

	/*$scope.setContent = function(content) {
		$scope.options.show = content;
	};*/

	$scope.noteChanged = function (id) {
		console.log(id+' '+this.noteText);
		var text = this.noteText;
		db.serialize(function() {
			db.get("UPDATE notes SET text = '"+text.replace(/'/g, "\\'")+"' WHERE id = "+id, function(err, row) {
				console.log('updated note text with id: '+id);
			});
		});
			return true;
	}

	$scope.addNote = function (note) {

		dbInsertNote(note).then(function(id) {
			var date = new Date();
			var newNote = {
				'id': id,
				'note': note.replace(/\n\r?/g, '<br>'),
				'year': date.getFullYear(),
				'dayAndMonth': date.getDate() + " " + monthNames[date.getMonth()],
				'time': date.getHours().padLeft() + ":" + date.getMinutes().padLeft(),
				'dateTime': (+date)
			};
			$scope.unsortedNotes.push(newNote);
			$scope.notes = $scope.groupNotes($scope.unsortedNotes);
			$scope.refresh = '';
			$scope.$apply();
		});
		$scope.newNote = "";
		/*storage.set(uuidv4(), { date: date.toLocaleString("en-US"), text: note, type: 'note' }, function(error) {
			if (error) throw error;
		});*/
	};

	$scope.addToLocalStorage = function (note) {

		//console.log(note);
		// Prevent adding of emty tasks
		if (note === undefined) return;

		// Add item to the local storage
		
		$scope.addNote(note);

		// show notification
		//$mdToast.showSimple('Note was added!');

		// clear view model
		$scope.noteName = '';
	};
}]);

	/* ENTER to submit note, SHIFT+ENTER for linebreak */
	app.directive('enterSubmit', function () {
    	return {
    	  restrict: 'A',
    	  link: function ($scope, elem, attrs) {
		
    	    elem.bind('keydown', function(event) {
    	      var code = event.keyCode || event.which;
		  
    	      if (code === 13) {
    	        if (!event.shiftKey) {
    	          event.preventDefault();
    	          $scope.$apply(attrs.enterSubmit);
    	        }
    	      }
    	    });
    	  }
    	}
		});

	/* Autogrow for textareas */
	app.directive("autoGrow", ['$window', function($window){
		return {
			link: function (scope, element, attr, $window) {
				var update = function () {
					var scrollLeft, scrollTop;
					scrollTop = window.pageYOffset;
					scrollLeft = window.pageXOffset;
	
					element.css("height", "auto");
					var height = element[0].scrollHeight;
					if (height > 0) {
						element.css("height", height + "px");
					}
					window.scrollTo(scrollLeft, scrollTop);
				};
				scope.$watch(attr.ngModel, function () {
					update();
				});
				attr.$set("ngTrim", "false");
			}
		};
	}]);

	/* notes edit */
	app.directive('contenteditable', function() {
		return {
		  require: 'ngModel',
		  restrict: 'A',
		  link: function(scope, elm, attr, ngModel) {
  
			function updateViewValue() {
			  ngModel.$setViewValue(this.innerHTML);
			}
			//Binding it to keyup, lly bind it to any other events of interest 
			//like change etc..
			elm.on('keyup', updateViewValue);
  
			scope.$on('$destroy', function() {
			  elm.off('keyup', updateViewValue);
			});
  
			ngModel.$render = function(){
			   elm.html(ngModel.$viewValue);
			}
  
		  }
	  }
  });

const remote = require('electron').remote;

document.addEventListener('DOMContentLoaded', function () {
	$('#textarea-noteadd').focus();

	$('.uk-switcher').on('beforeshow.uk.switcher', function(e){
		//console.log($(this),e);
		if (e.target.className.indexOf('uk-dropdown') === -1)
			loadnotes();
	});

	document.getElementById("button-close").addEventListener("click", function (e) {
       var window = remote.getCurrentWindow();
       window.close();
	}); 
	document.getElementById("button-hide").addEventListener("click", function (e) {
       var window = remote.getCurrentWindow();
       window.minimize(); 
    });
	/*
    function expandTextarea(id) {
	    document.getElementById(id).addEventListener('keyup', function() {
	        this.style.overflow = 'hidden';
	        this.style.height = 0;
			this.style.height = this.scrollHeight + 'px';
			console.log(this);
	    }, false);
	}

	expandTextarea('textarea-noteadd');*/

});

// LEGACY

// INSERT NOTE
	/*import db
		var filebuffer = fs.readFileSync('notes.db');
		var db = new SQL.Database(filebuffer);

	// Insert inputed note
	    db.run("INSERT INTO notes (note, dateTime) VALUES (:note, datetime('now'))", {':note': note});

	//getting last inserted id
	    var returnId = db.exec("SELECT last_insert_rowid() as num")[0].values[0][0];
*/
	    //test all rows
	    /*db.each("SELECT id,note,dateTime FROM notes", {}, function(row){
	    	console.log(row.id + " : " + row.note + " : " + row.dateTime)
	    });*/

	 /*export
	    var data = db.export();
		var buffer = new Buffer(data);
		fs.writeFileSync("notes.db", buffer);
*/
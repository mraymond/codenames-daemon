var fs = require('fs');

// Files that we load
var wordlists = ['normal', 'disney'];

function loadList(list) {
    var words = fs.readFileSync('wordlists/'+list+'.txt').toString().toLowerCase().split("\n");
    // Clean up the list
    words = cleanList(words, true);
    return words;
}

function cleanList(words, showDebug) {
    for (var i = 0; i < words.length; i++) {
        // Trim whitespace
        words[i] = words[i].trim();
        if(words[i] == "") {
            words.splice(i,1);
            i--;
            continue;
        }
        if(words[i].charAt(0) == "#") {
            words.splice(i,1);
            i--;
            continue;
        }
    }
    var results = [];
    var sorted_words = words.slice().sort();
    for (var i = 0; i < words.length - 1; i++) {
        if (sorted_words[i + 1] == sorted_words[i]) {
            words.splice(words.indexOf(sorted_words[i]),1);
            if(showDebug) console.log("Removing dupe: "+sorted_words[i])
        }
    }
    return words;
}

var lists = {};

for(var listIterator = 0; listIterator < wordlists.length; listIterator++) {
    lists[wordlists[listIterator]] = loadList(wordlists[listIterator]);
}

// Create all list
var listNames = Object.keys(lists);
lists["all"] = [];
for(var i = 0; i< listNames.length; i++) {
    lists["all"] = lists["all"].concat(lists[listNames[i]]);
}
lists["all"] = cleanList(lists["all"], false);
listNames.unshift("all");
console.log(listNames.length + " lists loaded");
console.log(lists.all.length + " total words loaded");
module.exports = {wordLists: listNames, lists: lists};

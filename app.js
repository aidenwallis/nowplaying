var App = {};
var userId = window.location.pathname.split('?')[0].substring(1);

var container = document.getElementById('container');
var currentAlbumCover = document.getElementById('album-current');
var newAlbumCover = document.getElementById('album-new');
var artistsElement = document.getElementById('artists');
var songName = document.getElementById('name');

App.currentSong = '';
App.currentCover = '';
App.loadedCovers = {};
App.open = false;
App.firstAlbumLoad = true;

App.checkSong = function() {
    fetch('https://spotify.aidenwallis.co.uk/u/' + userId + '?json=true')
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.error) {
            if (App.open) {
                App.close();
            }
            return;
        }
        if (!App.open) {
            App.openElement();
            setTimeout(function() {
                App.startUpdate(data);
            }, 1200);
            return;
        }
        App.startUpdate(data);
    })
    .catch(function(err) {
        console.error(err);
    });
};

App.close = function() {
    App.open = false;
    App.firstAlbumLoad = true;
    App.currentCover = '';
    App.currentSong = '';
    songName.classList.add('drop');
    setTimeout(function() {
        artistsElement.classList.add('drop');
    }, 350);
    setTimeout(function() {
        songName.innerHTML = '';
        artistsElement.innerHTML = '';
        songName.className = '';
        artistsElement.className = '';
        container.classList.remove('active');
    }, 800);
    setTimeout(function() {
        container.classList.remove('raise');
    }, 1350);
    setTimeout(function() {
        currentAlbumCover.src = '';
        currentAlbumCover.classList.remove('active');
        newAlbumCover.src = '';
        newAlbumCover.classList.remove('active');
    }, 1800);
};

App.startUpdate = function(data) {
    if (App.currentSong !== data.songName) {
        App.currentSong = data.songName;
        App.updateSongName(data.artists, data.title);
    }
    if (App.currentCover !== data.albumCover) {
        App.currentCover = data.albumCover;
        App.updateCover(data.albumCover);
    }
};

App.openElement = function() {
    App.open = true;
    container.classList.add('raise');
    setTimeout(function() {
        container.classList.add('active');
    }, 550);
}

App.updateSongName = function(artists, name) {
    artistsElement.classList.remove('active');
    setTimeout(function() {
        songName.classList.remove('active');
    }, 200);
    setTimeout(function() {
        artistsElement.textContent = artists.map(function(artist) {
            return artist.name;
        }).join(', ');
        artistsElement.classList.add('active');
    }, 550);
    setTimeout(function() {
        songName.textContent = name;
        songName.classList.add('active');
    }, 750);
};

App.updateCover = function(cover) {
    newAlbumCover.src = cover;
    newAlbumCover.onload = function() {
        newAlbumCover.className += ' active';
        if (App.firstAlbumLoad) {
            currentAlbumCover.classList.add('active');
        }
        setTimeout(function() {
            currentAlbumCover.src = cover;
            newAlbumCover.classList.remove('active');
            newAlbumCover.src = '';
        }, 450);
    };
};

App.transitionCover = function(cover) {
    
};

App.start = function() {
    setInterval(function() {
        App.checkSong();
    }, 3000);
};

App.start();

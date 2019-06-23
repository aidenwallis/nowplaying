var App = {};
var userId = window.location.pathname.split('?')[0].substring(1);
// var userId = '5b2e3e66f37dc906fc29d608';

var container = document.getElementById('container');
var currentAlbumCover = document.getElementById('album-current');
var newAlbumCover = document.getElementById('album-new');
var artistsElement = document.getElementById('artists');
var songName = document.getElementById('name');

function timeoutPromise(dur) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve();
        }, dur);
    });
}

function makeSongName(item) {
    return `${item.album && item.album.artists ? item.album.artists.map(a => a.name).join(', ') : 'Various Artists'} - ${item.name}`;
}

App.currentSong = '';
App.currentCover = '';
App.user = null;
App.loadedCovers = {};
App.waitingSocket = false;
App.socketReady = false;
App.open = false;
App.firstAlbumLoad = true;
App.scrollingSong = false;
App.scrollingArtists = false;

App.fetchUser = function() {
    return fetch('https://spotify.aidenwallis.co.uk/user/details/' + userId)
        .then(function(response) {
            if (response.status === 404) {
                window.location = '/';
                return;
            }
            if (response.status !== 200) {
                return timeoutPromise(2000)
                    .then(function() {
                        return App.fetchUser();
                    });
            }
            return response.json();
        })
        .then(function(data) {
            App.user = data;
            return data;
        })
        .catch(function(error) {
            return timeoutPromise(2000)
                .then(function() {
                    return App.fetchUser();
                });
        });
};

App.refreshToken = function() {
    return fetch('https://spotify.aidenwallis.co.uk/user/refresh/' + userId, { method: 'POST' })
        .then(function(response) {
            if (response.status !== 200) {
                return timeoutPromise(2000)
                    .then(function() {
                        return App.refreshToken();
                    });
            }
            return response.json();
        })
        .then(function(json) {
            if (!json.token) {
                return timeoutPromise(2000)
                    .then(function() {
                        return App.refreshToken();
                    });
            }
            App.user.token = json.token;
            return App.checkSong();
        })
        .catch(function(error) {
            return timeoutPromise(2000)
                .then(function() {
                    return App.refreshToken();
                })
        })

}

App.checkSong = function() {
    if (App.user.clientPoll) {
        return fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                Authorization: `Bearer ${App.user.token}`,
            }
        })
        .then(function(response) {
            if (response.status === 401) {
                return App.refreshToken();
            }
            if (response.status === 429) {
                // Ratelimited. Wait till we're un-ratelimited
                if (response.headers.has('Retry-After')) {
                    const delay = parseInt(response.headers.get('Retry-After'));
                    return timeoutPromise((delay * 1000) + 1000) // Second padding.
                        .then(function() {
                            App.checkSong();
                        });
                }
            }
            if (response.status === 204) {
                // No song playing.
                if (App.open) {
                    App.close();
                }
                return timeoutPromise(5000)
                    .then(function() {
                        App.checkSong();
                    });
            }
            return response.json().then(function(json) {
                if (!json.item && !json.hasOwnProperty('is_playing')) {
                    // Spotify API error.
                    return timeoutPromise(5000)
                        .then(function() {
                            App.checkSong();
                        });
                }
                if (!json.is_playing) {
                    if (App.open) {
                        App.close();
                    }
                } else {
                    const albumImages = json.item.album.images.reduce(function(acc, cur) {
                        acc[cur.height] = cur.url;
                        return acc;
                    }, {});
                    const data = {
                        songName: makeSongName(json.item),
                        artists: json.item.artists,
                        title: json.item.name,
                        albumCover: albumImages[Math.max(...Object.keys(albumImages))],
                    };
                    if (App.open) {
                        App.startUpdate(data);
                    } else {
                        App.openElement();
                        return timeoutPromise(1200)
                            .then(function() {
                                App.startUpdate(data);
                                return timeoutPromise(5000);
                            }).then(function() {
                                App.checkSong();
                            });
                    }
                }
                return timeoutPromise(5000).then(function() {
                    App.checkSong();
                });
            });
        })
        .catch(function(error) {
            console.error(error);
            return timeoutPromise(5000)
                .then(function() {
                    App.checkSong();
                });
        });
    }
    return fetch('https://spotify.aidenwallis.co.uk/u/' + userId + '?json=true&ts=' + Date.now())
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        setTimeout(function() {
            App.checkSong();
        }, 5000);
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
        return timeoutPromise(5000)
            .then(function() {
                App.checkSong();
            });
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
        App.scrollingSong = false;
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

App.updateSongName = function(artists = [], name) {
    const maxWidth = container.offsetWidth - 80; // padding for other shit
    artistsElement.classList.remove('active');
    setTimeout(function() {
        songName.classList.remove('active');
    }, 200);
    setTimeout(function() {
        artistsElement.textContent = artists.map(function(artist) {
            return artist.name;
        }).join(', ');
        artistsElement.classList.add('active');

        void artistsElement.offsetWidth;

        if (artistsElement.offsetWidth > maxWidth) {
            if (!App.scrollingArtists) {
                App.scrollingArtists = true;
                artistsElement.classList.add('scrolling');
            }
        } else {
            if (App.scrollingArtists) {
                App.scrollingArtists = false;
                artistsElement.classList.remove('scrolling');
            }
        }
    }, 550);
    setTimeout(function() {
        songName.textContent = name;
        
        void songName.offsetWidth;

        if (songName.offsetWidth > maxWidth) {
            if (!App.scrollingSong) {
                App.scrollingSong = true;
                songName.classList.add('scrolling');
            }
        } else {
            if (App.scrollingSong) {
                App.scrollingSong = false;
                songName.classList.remove('scrolling');
            }
        }

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

function playerError(error) {
    console.error("Failed to initialize player", error);
    window.location = '/';
}

function reloadPlayer(err) {
    console.error(err);
}

App.openSocket = function() {
    const player = new Spotify.Player({
        name: 'Spotify now playing player',
        getOAuthToken: function(done) {
            done && done(App.user.token);
        },
    });

    player.addListener('player_state_changed', function(state) {
        console.log(state);
    });

    player.addListener('initialization_error', playerError);
    player.addListener('authentication_error', reloadPlayer);
    player.addListener('account_error', reloadPlayer);
    player.addListener('playback_error', reloadPlayer);

    player.addListener('ready', function(state) {
        console.log('Ready with Device ID ', state.device_id);
    });

    player.addListener('not_ready', function(state) {
        console.log('Device ID has gone offline', state.device_id);
    });

    player.connect();
};

// window.onSpotifyWebPlaybackSDKReady = function() {
//     if (App.waitingSocket && App.user.socketable) {
//         App.openSocket();
//     }
//     App.socketReady = true;
// };

App.start = function() {
    App.fetchUser().then(function() {
        App.checkSong();
    });
};

App.start();

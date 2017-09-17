var Stats = {

  movies: [],
  shows: [],
  episodes: [],
  songs: [],
  albums: [],

  genres: {
    movies: {},
    shows: {}
  },

  movieGenresCount: {},
  showGenresCount: {},
  albumGenresCount: {},

  sectionMovieGenresCount: {},
  sectionShowGenresCount: {},
  sectionAlbumGenresCount: {},

  sectionKeys: {},
  sectionMovies: {},
  sectionShows: {},
  sectionEpisodes: {},
  sectionSongs: {},
  sectionAlbums: {},

  machineIdentifier: null,

  resolutionMappings: {
    '4k' : '4K',
    '1080' : '1080p',
    '720' : '720p',
    '480' : '480p',
    '576' : '576p',
    'sd' : 'SD'
  },

  getSections: function(uri, plexToken, callback) {
    var librarySectionsUrl = uri + '/library/sections?X-Plex-Token=' + plexToken;
      getXML(librarySectionsUrl, function(sectionsXml) {
        callback(sectionsXml);
      });
  },

  processLibrarySections: function(sectionsXml) {
    var directories = sectionsXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Directory');
    var dirMetadata = {}, title, type, scanner, key;

    for (var i = 0; i < directories.length; i++) {
      title = directories[i].getAttribute('title');
      type = directories[i].getAttribute('type');
      scanner = directories[i].getAttribute('scanner');
      key = directories[i].getAttribute('key');

      if (['movie', 'show', 'artist'].indexOf(type) >= 0) {
        dirMetadata[key] = {
          type: type,
          title: title
        };
      }
    }

    Stats.sectionKeys = dirMetadata;

    return dirMetadata;
  },

  getAllMovies: function(uri, plexToken, sectionKey, callback) {
    var librarySectionsUrl = uri + '/library/sections/' + sectionKey + '/all?X-Plex-Token=' + plexToken;

    getXML(librarySectionsUrl, function(sectionXml) {
      var moviesXml = sectionXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Video'),
          movies = [];

      for (var i = 0; i < moviesXml.length; i++) {
        var metadataXml = moviesXml[i].getElementsByTagName('Media')[0];

        movies.push({
          contentRating: moviesXml[i].getAttribute('contentRating'),
          rating: moviesXml[i].getAttribute('rating'),
          year: moviesXml[i].getAttribute('year'),
          addedAt: moviesXml[i].getAttribute('addedAt'),
          viewCount: moviesXml[i].getAttribute('viewCount'),
          videoResolution: metadataXml.getAttribute('videoResolution')
        });
      }
      callback(movies);
    });
  },

  getAllShows: function(uri, plexToken, sectionKey, callback) {
    var librarySectionsUrl = uri + '/library/sections/' + sectionKey + '/all?X-Plex-Token=' + plexToken;

    getXML(librarySectionsUrl, function(sectionXml) {
      var showsXml = sectionXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Directory'),
          shows = [];

      for (var i = 0; i < showsXml.length; i++) {
        shows.push({
          contentRating: showsXml[i].getAttribute('contentRating'),
          rating: showsXml[i].getAttribute('rating'),
          year: showsXml[i].getAttribute('year'),
          duration: showsXml[i].getAttribute('duration')
        });
      }

      callback(shows);
    });
  },

  getAllEpisodes: function(uri, plexToken, sectionKey, callback) {
    var librarySectionEpisodesUrl = uri + '/library/sections/' + sectionKey + '/all?type=4&X-Plex-Token=' + plexToken;

    getXML(librarySectionEpisodesUrl, function(sectionXml) {
      var episodesXml = sectionXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Video');
      var episodes = [], metadataXml;

      for (var i = 0; i < episodesXml.length; i++) {
        metadataXml = episodesXml[i].getElementsByTagName('Media')[0];

        episodes.push({
          addedAt: episodesXml[i].getAttribute('addedAt'),
          videoResolution: metadataXml.getAttribute('videoResolution')
        });
      }

      callback(episodes);
    });
  },

  getAllSongs: function(uri, plexToken, sectionKey, callback) {
    var librarySectionSongsUrl = uri + '/library/sections/' + sectionKey + '/all?type=10&X-Plex-Token=' + plexToken,
        containerSize = 10000,
        containerStart = 0,
        songs = [];

    function pagedRequest() {
      var pagedLibrarySectionSongsUrl = librarySectionSongsUrl + '&sort=titleSort:asc&X-Plex-Container-Size=' + containerSize + '&X-Plex-Container-Start=' + containerStart;
      var p = new promise.Promise();
      debug('pagedLibrarySectionSongsUrl', pagedLibrarySectionSongsUrl);
      getXML(pagedLibrarySectionSongsUrl, function(sectionXml) {
        var songsXml = sectionXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Track'),
            songData, metadataXml;

        if (songsXml.length === 0) {
          return callback(songs);
        }

        containerStart += containerSize;

        for (var i = 0; i < songsXml.length; i++) {
          songData = {};
          songData.addedAt = songsXml[i].getAttribute('addedAt');
          metadataXml = songsXml[i].getElementsByTagName('Media')[0];
          songData.bitrate = metadataXml.getAttribute('bitrate');

          songs.push(songData);
        }

        return p.then(pagedRequest());
      });

      return p;
    }

    pagedRequest();
  },

  getAllAlbums: function(uri, plexToken, sectionKey, callback) {
    var librarySectionAlbumsUrl = uri + '/library/sections/' + sectionKey + '/all?type=9&X-Plex-Token=' + plexToken;

    getXML(librarySectionAlbumsUrl, function(sectionXml) {
      var albumsXml = sectionXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Directory'),
          albums = [], albumData;

      for (var i = 0; i < albumsXml.length; i++) {
        albumData = {};
        albumData.year = albumsXml[i].getAttribute('year');
        albumData.addedAt = albumsXml[i].getAttribute('addedAt');

        albums.push(albumData);
      }

      callback(albums);
    });
  },

  getSectionGenres: function(uri, plexToken, sectionKey, callback) {
    var librarySectionGenresUrl = uri + '/library/sections/' + sectionKey + '/genre?X-Plex-Token=' + plexToken;

    getXML(librarySectionGenresUrl, function(genresXml) {
      var genreNodes = genresXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Directory');
      var genres = {}, genreKey, genreTitle;
      for (var i = 0; i < genreNodes.length; i++) {
        genreKey = genreNodes[i].getAttribute('key');
        genreTitle = genreNodes[i].getAttribute('title');
        genres[genreKey] = genreTitle;
      }
      callback(genres);
    });
  },

  getMoviesByGenre: function(uri, plexToken, sectionKey, genreKey, genreTitle, callback) {
    var filteredMoviesUrl = uri + '/library/sections/' + sectionKey + '/all?genre=' + genreKey + '&X-Plex-Token=' + plexToken;
    getXML(filteredMoviesUrl, function(moviesXml) {
      var movies = moviesXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Video');
      callback(movies, genreTitle, sectionKey);
    });
  },

  getShowsByGenre: function(uri, plexToken, sectionKey, genreKey, genreTitle, callback) {
    var filteredShowsUrl = uri + '/library/sections/' + sectionKey + '/all?genre=' + genreKey + '&X-Plex-Token=' + plexToken;
    getXML(filteredShowsUrl, function(showsXml) {
      var shows = showsXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Directory');
      callback(shows, genreTitle, sectionKey);
    });
  },

  getAlbumsByGenre: function(uri, plexToken, sectionKey, genreKey, genreTitle, callback) {
    var filteredAlbumsUrl = uri + '/library/sections/' + sectionKey + '/all?genre=' + genreKey + '&X-Plex-Token=' + plexToken;
    getXML(filteredAlbumsUrl, function(albumsXml) {
      var albums = albumsXml.getElementsByTagName('MediaContainer')[0].getElementsByTagName('Directory');
      callback(albums, genreTitle, sectionKey);
    });
  },

  generateMovieStats: function(movies, genreCount) {
    var contentRating,
        contentRatingCount = {},
        movieRating,
        movieRatingCount = {},
        resolution,
        resolutionCount = {},
        year,
        yearCount = {},
        sortedYears,
        viewed,
        viewCount = {
          yes: 0,
          no: 0
        },
        addedAt,
        datesAdded = [],
        formattedRating;

    for (var i = 0; i < movies.length; i++) {

      // content rating count
      contentRating = movies[i].contentRating;
      if (contentRatingCount[contentRating]) {
        contentRatingCount[contentRating]++;
      } else {
        contentRatingCount[contentRating] = 1;
      }

      // movie rating
      // round down movie rating so that ratings 4.0-4.9 = 4 etc
      movieRating = parseInt(movies[i].rating);
      if (movieRatingCount[movieRating]) {
        movieRatingCount[movieRating]++;
      } else {
        movieRatingCount[movieRating] = 1;
      }

      // resolution count
      resolution = movies[i].videoResolution;
      if (resolutionCount[resolution]) {
        resolutionCount[resolution]++;
      } else {
        resolutionCount[resolution] = 1;
      }

      // years count
      year = parseInt(movies[i].year);
      if (yearCount[year]) {
        yearCount[year]++;
      } else {
        yearCount[year] = 1;
      }

      // views count
      viewed = parseInt(movies[i].viewCount);
      if (viewed) {
        viewCount.Viewed++;
      } else {
        viewCount['Not Viewed']++;
      }


      // movies added over time
      // set date time to beginning of day to make it easy to work with
      addedAt = new Date(parseInt(movies[i].addedAt) * 1000).setHours(0, 0, 0, 0);
      datesAdded.push(addedAt);
    }

    // clean up, remove invalid data
    if (contentRatingCount[null]) {
      contentRatingCount.Unknown = contentRatingCount[null];
      delete contentRatingCount[null];
    }
    if (resolutionCount[null]) {
      resolutionCount.Unknown = resolutionCount[null];
      delete resolutionCount[null];
    }
    delete yearCount[NaN];

    // add missing years
    sortedYears = Object.keys(yearCount).sort();
    for (i = sortedYears[0]; i < sortedYears[sortedYears.length - 1]; i++) {
      if (!yearCount[i]) {
        yearCount[i] = 0;
      }
    }

    // collate movies added over time data
    var sortedDates = datesAdded.sort(function(a, b) {return a - b;}),
        today = new Date(Date.now()),
        startDate = new Date(sortedDates[0]),
        dateAddedCount = {}, totalCount = 0, currentTimestamp, dayCount, dateString, j;

    for (d = startDate; d <= today; d.setDate(d.getDate() + 1)) {
      currentTimestamp = d.getTime();
      dayCount = 0;

      for (j = 0; j < sortedDates.length; j++) {
        if (sortedDates[j] === currentTimestamp) {
          dayCount += 1;
        }
      }

      // only add date to array if movies were added that day
      if (dayCount > 0) {
        totalCount += dayCount;

        dateString = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        dateAddedCount[dateString] = totalCount;
      }
    }

    // format movie ratings data
    for (var rating in movieRatingCount) {
      if (isNaN(rating)) {
        movieRatingCount['No Rating'] = movieRatingCount[NaN];
      } else {
        formattedRating = rating + '.0 - ' + rating + '.9';
        movieRatingCount[formattedRating] = movieRatingCount[rating];
      }
      delete movieRatingCount[rating];
    }
    // group 9.0-10.0 ratings together
    if (movieRatingCount['9.0 - 9.9'] || movieRatingCount['10.0 - 10.9']) {
      movieRatingCount['9.0 - 10.0'] = (movieRatingCount['9.0 - 9.9'] || 0) + (movieRatingCount['10.0 - 10.9'] || 0);
        delete movieRatingCount['9.0 - 9.9'];
        delete movieRatingCount['10.0 - 10.9'];
    }

    // format movie resolutions data
    for (resolution in resolutionCount) {
      if (Stats.resolutionMappings[resolution]) {
        resolutionCount[Stats.resolutionMappings[resolution]] = resolutionCount[resolution];
        delete resolutionCount[resolution];
      }
    }

    return {
      contentRatingCount: contentRatingCount,
      movieRatingCount: movieRatingCount,
      resolutionCount: resolutionCount,
      yearCount: yearCount,
      genreCount: genreCount,
      genres: Stats.genres.movies,
      dateAddedCount: dateAddedCount,
      viewCount: viewCount
    };
  },

  generateShowStats: function(shows, episodes, genreCount) {
    var contentRatingCount = {},
        showRatingCount = {},
        resolutionCount = {},
        yearCount = {},
        episodesDatesAdded = [],
        resolution;

    for (var i = 0; i < shows.length; i++) {

      // content rating count
      var contentRating = shows[i].contentRating;
      if (contentRatingCount[contentRating]) {
        contentRatingCount[contentRating]++;
      } else {
        contentRatingCount[contentRating] = 1;
      }

      // show rating partitioning (round down -> 4.0-4.9 = 4, etc)
      var showRating = parseInt(shows[i].rating);
      if (showRatingCount[showRating]) {
        showRatingCount[showRating]++;
      } else {
        showRatingCount[showRating] = 1;
      }

      // years count
      var year = parseInt(shows[i].year);
      if (yearCount[year]) {
        yearCount[year]++;
      } else {
        yearCount[year] = 1;
      }
    }

    // iterate over all episodes
    for (i = 0; i < episodes.length; i++) {

      // resolution count
      resolution = episodes[i].videoResolution;
      if (resolutionCount[resolution]) {
        resolutionCount[resolution]++;
      } else {
        resolutionCount[resolution] = 1;
      }

      // episodes added over time (set date/time to beginning of the day)
      var addedAt = new Date(parseInt(episodes[i].addedAt) * 1000).setHours(0, 0, 0, 0);
      episodesDatesAdded.push(addedAt);
    }


    // cleanup, remove invalid data
    if (contentRatingCount[null]) {
      contentRatingCount.Unknown = contentRatingCount[null];
      delete contentRatingCount[null];
    }
    if (resolutionCount[null]) {
      resolutionCount.Unknown = resolutionCount[null];
      delete resolutionCount[null];
    }
    delete yearCount[NaN];

    // add missing years
    var sortedYears = Object.keys(yearCount).sort();
    for (i = sortedYears[0]; i < sortedYears[sortedYears.length -1]; i++) {
      if (!yearCount[i]) {
        yearCount[i] = 0;
      }
    }

    // collate episodes added over time data
    var sortedDates = episodesDatesAdded.sort(function(a, b) { return a - b;}),
        today = new Date(Date.now()),
        startDate = new Date(sortedDates[0]),
        episodesDateAddedCount = {},
        totalCount = 0;

    // iterate over dates from first episode added date added to today
    for (var d = startDate; d <= today; d.setDate(d.getDate() + 1)) {
      var currentTimestamp = d.getTime();
      var dayCount = 0;

      for (i = 0; i < sortedDates.length; i++) {
        if (sortedDates[i] === currentTimestamp) {
          dayCount++;
        }
      }

      // only add date to array if shows were added that day
      if (dayCount > 0) {
        totalCount += dayCount;

        var dateString = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        episodesDateAddedCount[dateString] = totalCount;
      }
    }

    // format show ratings data
    for (var rating in showRatingCount) {
      if (isNaN(rating)) {
        showRatingCount['No Rating'] = showRatingCount[NaN];
      } else {
        var formattedRating = rating + '.0 - ' + rating + '.9';
        showRatingCount[formattedRating] = showRatingCount[rating];
      }
      delete showRatingCount[rating];
    }

    // group 9.0-10.0 ratings together
    if (showRatingCount['9.0 - 9.9'] || showRatingCount['10.0 - 10.9']) {
      showRatingCount['9.0 - 10.0'] = (showRatingCount['9.0 - 9.9'] || 0) + (showRatingCount['10.0 - 10.9'] || 0);
      delete showRatingCount['9.0 - 9.9'];
      delete showRatingCount['10.0 - 10.9'];
    }

    // format movie resolutions data
    for (resolution in resolutionCount) {
      if (Stats.resolutionMappings[resolution]) {
        resolutionCount[Stats.resolutionMappings[resolution]] = resolutionCount[resolution];
        delete resolutionCount[resolution];
      }
    }

    return {
      contentRatingCount: contentRatingCount,
      showRatingCount: showRatingCount,
      resolutionCount: resolutionCount,
      yearCount: yearCount,
      genreCount: genreCount,
      genres: Stats.genres.shows,
      episodesDateAddedCount: episodesDateAddedCount
    };
  },

  generate: function(server, plexToken, callback) {

    Stats.machineIdentifier = server.machine_identifier;

    jQuery('.alert.alert-status .status').text('Updating Plexius Stats...');
    jQuery('.alert.alert-status').removeClass('transition-out');


    var taskCount = 0;

    Stats.getSections(server.uri, plexToken, function(sectionsXml) {
      if (!sectionsXml) {
        callback(false);
        return;
      }

      var processedSections = Stats.processLibrarySections(sectionsXml);

      for (var sectionKey in processedSections) {
        processSection(processedSections, sectionKey);
      }

      callback(processedSections);
    });

    function processSection(processedSections, sectionKey) {
      // var taskCount = 0;

      // process movies
      if (processedSections[sectionKey].type === 'movie') {
        taskCount++;
        Stats.sectionMovieGenresCount[sectionKey] = {};

        Stats.getAllMovies(server.uri, plexToken, sectionKey, function(movies) {
          debug('movies', movies);
          Stats.movies = Stats.movies.concat(movies);
          Stats.sectionMovies[sectionKey] = movies;

          Stats.getSectionGenres(server.uri, plexToken, sectionKey, function(genres) {
            Stats.genres.movies = genres;
            debug('movie genres', genres);
            taskCount += Object.keys(genres).length;

            for (var genreKey in genres) {
              Stats.getMoviesByGenre(server.uri, plexToken, sectionKey, genreKey, genres[genreKey], processGenreMovies);
            }
            taskCompleted();
          });
        });

      // process shows
      } else if (processedSections[sectionKey].type === 'show') {
        taskCount++;
        Stats.sectionShowGenresCount[sectionKey] = {};
        Stats.sectionEpisodes[sectionKey] = [];

        Stats.getAllShows(server.uri, plexToken, sectionKey, function(shows) {
          debug('shows', shows);
          Stats.shows = Stats.shows.concat(shows);
          Stats.sectionShows[sectionKey] = shows;

          Stats.getSectionGenres(server.uri, plexToken, sectionKey, function(genres) {
            Stats.genres.shows = genres;
            debug('shows genres', genres);
            taskCount += Object.keys(genres).length;

            for (var genreKey in  genres) {
              Stats.getShowsByGenre(server.uri, plexToken, sectionKey, genreKey, genres[genreKey], processGenreShows);
            }
            taskCompleted();
          });
        });

        // get all tv show episodes for section
        taskCount++;
        Stats.getAllEpisodes(server.uri, plexToken, sectionKey, function(episodes) {
          debug('episodes', episodes);
          Stats.episodes = Stats.episodes.concat(episodes);
          Stats.sectionEpisodes[sectionKey] = Stats.sectionEpisodes[sectionKey].concat(episodes);
          taskCompleted();
        });

      // process music
      } else if (processedSections[sectionKey].type === 'artist') {
        taskCount++;
        Stats.sectionAlbumGenresCount[sectionKey] = {};

        Stats.getAllSongs(server.uri, plexToken, sectionKey, function(songs) {
          debug('songs', songs);
          Stats.songs = Stats.songs.concat(songs);
          Stats.sectionSongs[sectionKey] = songs;

          Stats.getSectionGenres(server.uri, plexToken, sectionKey, function(genres) {
            debug('music genres', genres);

            taskCount += Object.keys(genres).length;

            for (var genreKey in genres) {
              Stats.getAlbumsByGenre(server.uri, plexToken, sectionKey, genreKey, genres[genreKey], processGenreAlbums);
            }
            taskCompleted();
          });
        });

        taskCount++;
        Stats.getAllAlbums(server.uri, plexToken, sectionKey, function(albums) {
          debug('albums', albums);
          Stats.albums = Stats.albums.concat(albums);
          Stats.sectionAlbums[sectionKey] = albums;

          taskCompleted();
        });
      }


    }

    function processGenreMovies(genreMovies, genreTitle, sectionKey) {
      if (Stats.movieGenresCount[genreTitle]) {
        Stats.movieGenresCount[genreTitle] += genreMovies.length;
      } else {
        Stats.movieGenresCount[genreTitle] = genreMovies.length;
      }

      if (Stats.sectionMovieGenresCount[sectionKey][genreTitle]) {
        Stats.sectionMovieGenresCount[sectionKey][genreTitle] += genreMovies.length;
      } else {
        Stats.sectionMovieGenresCount[sectionKey][genreTitle] = genreMovies.length;
      }
      taskCompleted();
    }

    function processGenreShows(genreShows, genreTitle, sectionKey) {
      if (Stats.showGenresCount[genreTitle]) {
        Stats.showGenresCount[genreTitle] += genreShows.length;
      } else {
        Stats.showGenresCount[genreTitle] = genreShows.length;
      }

      if (Stats.sectionShowGenresCount[sectionKey][genreTitle]) {
        Stats.sectionShowGenresCount[sectionKey][genreTitle] += genreShows.length;
      } else {
        Stats.sectionShowGenresCount[sectionKey][genreTitle] = genreShows.length;
      }

      taskCompleted();
    }

    function processGenreAlbums(genreAlbums, genreTitle, sectionKey) {
      if (Stats.albumGenresCount[genreTitle]) {
        Stats.albumGenresCount[genreTitle] += genreAlbums.length;
      } else {
        Stats.albumGenresCount[genreTitle] = genreAlbums.length;
      }

      if (Stats.sectionAlbumGenresCount[sectionKey][genreTitle]) {
        Stats.sectionAlbumGenresCount[sectionKey][genreTitle] += genreAlbums.length;
      } else {
        Stats.sectionAlbumGenresCount[sectionKey][genreTitle] = genreAlbums.length;
      }

      taskCompleted();
    }


    // TODO
    function taskCompleted() {
      var stats = {};

      debug('Data task finished', taskCount + ' remaining');
      taskCount--;

      if (taskCount === 0) {
        debug('All data tasks finished');
        var getUrl = window.location;
        var baseUrl = getUrl .protocol + '//' + getUrl.host + '/' + getUrl.pathname.split('/')[1];

        var movieStats = Stats.generateMovieStats(Stats.movies, Stats.movieGenresCount);
        var showStats = Stats.generateShowStats(Stats.shows, Stats.episodes, Stats.showGenresCount);
        // var musicStats = generateMusicStats(Stats.songs, Stats.albums, Stats.albumGenresCount);


        // var perSectionMovieStats = {};
        // for (var sectionKey in sectionMovies) {
        //     var sectionMovieStats = generateMovieStats(sectionMovies[sectionKey], Stats.sectionMovieGenresCount[sectionKey]);
        //     perSectionMovieStats[sectionKey] = sectionMovieStats;
        // }

        stats = {
          baseUrl: baseUrl,
          sectionKeys: Stats.sectionKeys, // TODO Move this to storage and update it everytime the plugin is loaded, not once per day
          machineIdentifier: Stats.machineIdentifier, // same
          movie: movieStats,
          show: showStats
        };

        // callback(movieStats, perSectionMovieStats);
        local_storage_set('PlexiusStats', stats);
        local_storage_set('PlexiusStatsUpdated', Date.now());
        // localStorage.setItem('PlexiusStats', JSON.stringify(stats));
        // localStorage.setItem('PlexiusStatsUpdated', Date.now());
        jQuery('.alert.alert-status').addClass('transition-out');
        insertStatsButton();
      }
    }
  }

};
var omdbApi = {

    linkUri: 'http://www.imdb.com/title/',

    searchByImdbId: function(query, callback) {
        var api_url = 'https://www.omdbapi.com/?apikey=' + constants.omdbApiKey + '&i=' + query;

        getJSONWithCache(api_url, function(omdb_json) {
            callback(omdb_json);
        });
    },

    searchByTitle: function(query, year, resourceType, season, episode, callback) {
        var api_url = 'https://www.omdbapi.com/?apikey=' + constants.omdbApiKey + '&t=' + encodeURIComponent(query) + '&type=' + resourceType;

        if (year) {
            api_url += '&y=' + year;
        }
        if (season) {
            api_url += '&season=' + season;
        }
        if (episode) {
            api_url += '&episode=' + episode;
        }

        getJSONWithCache(api_url, function(omdb_json) {
            callback(omdb_json);
        });
    },

    processResource: function(movieDetails) {
        // no imdb rating for seasons
        // there is a built in imdb rating for some movies, so check for that too
        if (!settings.showIMDB || jQuery(imdbRatingContainerEl).length || jQuery('.plexius-imdb-rating-container').length || movieDetails.resourceType === 'season') {
            return;
        }
        if (movieDetails.imdb_id) {
            omdbApi.searchByImdbId(movieDetails.imdb_id, function(resourceData) {
                injectRating({
                    name: 'imdb',
                    linkUri: omdbApi.linkUri + resourceData.imdbID,
                    imgSrc: getResourcePath('imdb_logo.png'),
                    rating: resourceData.imdbRating
                });
            });
        } else {
            if (movieDetails.resourceType === 'series') { // many series has a year attached to it, or a country code which messes up the search
                var matches = /\(([^)]+)\)/.exec(movieDetails.resourceTitle);
                if (matches && matches.length && /^\d+$/.test(matches[matches.length - 1])) {
                    movieDetails.resourceYear = matches[matches.length - 1];
                }
                movieDetails.resourceTitle = movieDetails.resourceTitle.replace(/ *\([^)]*\) */g, '').trim();
            }

            omdbApi.searchByTitle(movieDetails.resourceTitle, movieDetails.resourceYear, movieDetails.resourceType, movieDetails.season, movieDetails.episode, function(resourceData) {
                if (resourceData.Response !== 'False') {
                    injectRating({
                        name: 'imdb',
                        linkUri: omdbApi.linkUri + resourceData.imdbID,
                        imgSrc: getResourcePath('imdb_logo.png'),
                        rating: resourceData.imdbRating
                    });
                }
            });
        }
    }
};

var traktApi = {

    api_key: constants.traktApiKey,
    customHeaders: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': constants.traktApiKey
    },
    apiUri: 'https://api.trakt.tv/',
    linkUri: 'http://trakt.tv/',

    parseTitle: function(title) {
        // remove spaces and replace them by dashes
        title = title.split(' ').join('-');

        // remove spaces and replace them by dashes and lowercase
        title = title.split('.').join('-').toLowerCase();

        return title;
    },

    getShowDetails: function(id, callback) {
        apiUrl = traktApi.apiUri  + 'shows/' + id + '?extended=full';
        getJSONWithCache(apiUrl, function(traktJson) {
            callback(traktJson);
        }, traktApi.customHeaders);
    },

    getMovieRating: function(query, year, imdbId, callback) {
        var apiUrl;
        if (imdbId) {
            apiUrl = traktApi.apiUri + 'search/imdb/' + imdbId + '?extended=full';
        } else {
            query = query.split(' ').join('-').toLowerCase();
            apiUrl = traktApi.apiUri + 'search/movie?query=' + encodeURIComponent(query) + '&years=' + year + '&extended=full';
        }

        getJSONWithCache(apiUrl, function(traktJson) {
            callback(traktJson);
        }, traktApi.customHeaders);
    },

    getShowByName: function(query, year, extended, callback) {
        query = query.split(' ').join('-').toLowerCase();
        var apiUrl = traktApi.apiUri + 'search/show?query=' + encodeURIComponent(traktApi.parseTitle(query)) + '&years=' + year;

        if (extended) {
            apiUrl += '&extended=full';
        }

        getJSONWithCache(apiUrl, function(traktJson) {
            callback(traktJson);
        }, traktApi.customHeaders);
    },

    getSeasonRating: function(query, seasonIndex, callback) {
        var apiUrl = traktApi.apiUri + 'shows/' + encodeURIComponent(query) + '/seasons/' + seasonIndex + '/ratings';

        getJSONWithCache(apiUrl, function(traktJson) {
            callback(traktJson);
        }, traktApi.customHeaders);
    },

    getAllEpisodesBySlug: function(showSlug, showIndex, callback){
        var apiUrl = traktApi.apiUri + 'shows/' + showSlug + '/seasons/' + showIndex + '?extended=full';

        getJSONWithCache(apiUrl, function(traktJson) {
            callback(traktJson);
        }, traktApi.customHeaders);
    },

    getEpisodeRating: function(query, seasonIndex, episode_num, callback) {
        var apiUrl = traktApi.apiUri + 'shows/' + encodeURIComponent(query) + '/seasons/' + seasonIndex + '/episodes/' + episode_num + '/ratings';

        getJSONWithCache(apiUrl, function(traktJson) {
            callback(traktJson);
        }, traktApi.customHeaders);
    },

    injectYoutubeTrailer: function(trailerApi) {
        jQuery(headerToolbarContainerEl).prepend('<a href="' + trailerApi + '" target="_blank" aria-label="Trailer" title="Trailer"><button class="plexius-trailer-button Link-link-2wZEE Link-default-1sSkX tether-target tether-element-attached-top tether-element-attached-center tether-target-attached-bottom tether-target-attached-center" style="text-align: center" type="button"><i class="plex-icon-trailer" aria-hidden="true"></i></button></a>');
    },

    processResource: function(movieDetails) {
        // no trackt data for seasons (for now)
        if (movieDetails.resourceType === 'season') {
            return;
        }

        var query, url;

        if (movieDetails.imdb_id) {
            query = movieDetails.imdb_id;
            url = movieDetails.imdb_id;
        } else {
            query = movieDetails.resourceTitle;
            url = movieDetails.resourceTitle.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
        }

        if (movieDetails.resourceType === 'movie') {
            traktApi.getMovieRating(query, movieDetails.resourceYear, movieDetails.imdb_id, function(traktJson) {
                if (traktJson.error) {
                    return;
                } else {
                    traktJson = traktJson[0].movie;
                    var rating = Math.round(traktJson.rating * 10);

                    if (settings.showTrakt) {
                        injectRating({
                            name: 'trakt',
                            linkUri: traktApi.linkUri + 'movies/' + traktJson.ids.slug,
                            imgSrc: getResourcePath('trakt_logo.png'),
                            rating: rating + '%'
                        });
                    }
                    if (settings.showTrailer && traktJson.trailer) {
                        traktApi.injectYoutubeTrailer(traktJson.trailer);
                    }
                }
            });
        } else if (movieDetails.resourceType === 'series') {
            traktApi.getShowByName(query, movieDetails.resourceYear, true, function(traktJson) {
                if (traktJson.error) {
                    return;
                }
                if (traktJson[0]) {
                    traktJson = traktJson[0].show;
                }
                var rating = Math.round(traktJson.rating * 10);
                injectRating({
                    name: 'trakt',
                    linkUri: traktApi.linkUri + 'shows/' +  traktJson.ids.slug,
                    imgSrc: getResourcePath('trakt_logo.png'),
                    rating: rating + '%'
                });
            });
        }

    }
};

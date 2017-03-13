omdb_api = {
    searchByImdbId: function(query, callback) {
        var api_url = 'https://www.omdbapi.com/?i=' + query;

        getJSONWithCache(api_url, function(omdb_json) {
            callback(omdb_json);
        });
    },

    searchByTitle: function(query, year, resourceType, season, episode, callback) {
        var api_url = 'https://www.omdbapi.com/?t=' + encodeURIComponent(query) +'&type=' + resourceType;

        if (year ) {
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
    }
};
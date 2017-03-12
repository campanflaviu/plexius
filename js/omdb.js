omdb_api = {
    searchByImdbId: function(query, callback) {
        var api_url = "https://www.omdbapi.com/?i=" + query;

        getJSONWithCache(api_url, function(omdb_json) {
            callback(omdb_json);
        });
    },

    searchByMovieTitle: function(query, movie_year, callback) {
        var api_url = "https://www.omdbapi.com/?t=" + encodeURIComponent(query) + "&y=" + movie_year;

        getJSONWithCache(api_url, function(omdb_json) {
            callback(omdb_json);
        });
    }
};
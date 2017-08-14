
chrome.storage.local.get('PlexiusStats', function(result) {
  if (result.PlexiusStats) {
    var stats = result.PlexiusStats;
    init(stats);
    // console.log(stats);
  } else {
    document.getElementById('error').style.display = 'block';
  }
});

Chart.defaults.global.defaultFontColor = '#efefef';

function init(stats) {
  var movies = stats.movie;


  // movie content ratings
  var contentRatings = movies.contentRatingCount;
  showPieChart('contentRatings', Object.values(contentRatings), Object.keys(contentRatings), 'Movies Content Rating');

  // movie genres
  var genreCount = movies.genreCount;
  showPieChart('genreCount', Object.values(genreCount), Object.keys(genreCount), 'Movies Genres');

  // movie ratings
  var movieRatings = movies.movieRatingCount;
  showPieChart('movieRatings', Object.values(movieRatings), Object.keys(movieRatings), 'Movies Ratings');

  // movie ratings
  var resolutionCount = movies.resolutionCount;
  showPieChart('resolutionCount', Object.values(resolutionCount), Object.keys(resolutionCount), 'Movies Resolutions');

  // movie ratings
  var viewCount = movies.viewCount;
  showPieChart('viewCount', Object.values(viewCount), Object.keys(viewCount), 'View Count');

  // movie added over time
  var dateAddedCount = movies.dateAddedCount;
  showBarChart('movieAdded', dateAddedCount.values, dateAddedCount.dates, 'Movies added over time');

  // movies count by release year
  var yearCount = movies.yearCount;
  showBarChart('yearCount', Object.values(yearCount), Object.keys(yearCount), 'Movies by release year');
}

function showPieChart(elementId, data, labels, titleText) {
  new Chart(document.getElementById(elementId), {
    type: 'pie',
    options: {
      title: {
        display: true,
        text: titleText
      },
      legend: {
        position: 'right',
        fullWidth: false
      },
      pieceLabel: {
        render: 'percentage',
        fontColor: '#000'
      }
    },
    data: {
      labels: labels,
      datasets: [{
        data: data,
        borderColor: '#3F4245',
        backgroundColor: randomColor({
          count: labels.length,
          hue: 'orange'
        }),
      }]
    }
  });
}

function showBarChart(elementId, data, labels, titleText) {
  new Chart(document.getElementById(elementId), {
    type: 'bar',
    options: {
      maintainAspectRatio: false,
      legend: {
        display: false
      },
      title: {
        display: true,
        text: titleText
      }
    },
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: 'orange',
      }]
    }
  });
}


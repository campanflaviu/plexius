var stats, openerTabId;

chrome.storage.local.get('PlexiusStats', function(result) {
  if (result.PlexiusStats) {
    stats = result.PlexiusStats;
    // console.log(stats);
    init();
  } else {
    document.getElementById('error').style.display = 'block';
  }
});

chrome.tabs.getCurrent(function(tab) {
  openerTabId = tab.openerTabId;
});

function init() {

  // Movies
  var movieSection = getSection('movie');
  drawYearChart(stats.movie.yearCount, 'movie-year-chart', movieSection);
  drawDonutChart(stats.movie.contentRatingCount, 'movie-content-rating-chart', movieSection, 'content-rating');
  drawDonutChart(stats.movie.resolutionCount, 'movie-resolution-chart', movieSection, 'resolution');
  drawDonutChart(stats.movie.genreCount, 'movie-genre-chart', movieSection, 'genre');
  drawDonutChart(stats.movie.movieRatingCount, 'movie-rating-chart', movieSection);
  drawDateAddedChart(stats.movie.dateAddedCount, 'movie-date-added-chart', movieSection, '#109618');

  // TV Shows
  var showSection = getSection('show');
  drawYearChart(stats.show.yearCount, 'show-year-chart', showSection);
  drawDonutChart(stats.show.genreCount, 'show-genre-chart', showSection, 'genre');
  drawDonutChart(stats.show.showRatingCount, 'show-rating-chart', showSection);
  drawDateAddedChart(stats.show.episodesDateAddedCount, 'show-date-added-chart', 'Episodes', '#D62728', showSection);
  drawDonutChart(stats.show.contentRatingCount, 'show-content-rating-chart', showSection, 'content-rating');
  drawDonutChart(stats.show.resolutionCount, 'show-resolution-chart', showSection, 'resolution');
}

function getSection(sectionName) {
  var sectionId = Object.keys(stats.sectionKeys).filter(function(key) {
    return stats.sectionKeys[key].type === sectionName;
  })[0];

  return {
    id: sectionId,
    name: sectionName,
    title: stats.sectionKeys[sectionId].title
  };
}

function getGenreId(type, genreName) {
  return Object.keys(stats[type].genres).filter(function(key) {
    return stats[type].genres[key] === genreName;
  })[0];
}

function formatResolutionFilter(resolution) {
  if (/\d+/g.test(resolution)) { // if the resolution has numbers, strip the letters
    return parseInt(resolution);
  } else {
    return resolution.toLowerCase();
  }
}

function goToPlexWithFilter(sectionId, filter, filterLabel) {
  var plexUrl = stats.baseUrl + '?#!/server/' + stats.machineIdentifier + '?key=' + encodeURIComponent('/library/sections/' + sectionId) + '&filters=' + encodeURIComponent(filter) + '&filterLabel=' + filterLabel;

  // check if the parent tab is opened, if not, open a new one
  chrome.tabs.get(openerTabId, function() {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError.message);

      chrome.tabs.create({'url': plexUrl}, function(tab) {
        openerTabId = tab.id;
      });
    } else {
      // Tab exists

      chrome.tabs.update(openerTabId, {
        'active': true,
        'url': plexUrl
      });
    }
  });



}


// c3.js charts

function drawDateAddedChart(chartData, elementId, section, color) {
  var xLabels = ['x'];
  var yData = ['Total Count'];


  for (var date in chartData) {
      xLabels.push(date);
      yData.push(chartData[date]);
  }

  var chart = c3.generate({
      bindto: '#' + elementId,
      data: {
          x: 'x',
          type: 'area',
          columns: [
              yData,
              xLabels,
          ],
          color: function() {
              return color;
          }
      },
      axis: {
          x: {
              type: 'timeseries',
              tick: {
                  format: '%Y-%m-%d',
                  fit: false
              }
          },
          y: {
              label: {
                  text: 'Total Number of ' + section.title,
                  position: 'outer-middle'
              }
          }
      },
      grid: {
          y: {
              show: true
          }
      },
      legend: {
          show: false
      }
  });
}

function drawYearChart(chartData, elementId, section) {
    var xLabels = ['x'];
    var yData = ['Count'];
    for (var year in chartData) {
        xLabels.push(year);
        yData.push(chartData[year]);
    }

    c3.generate({
        bindto: '#' + elementId,
        data: {
            x: 'x',
            type: 'bar',
            columns: [
                xLabels,
                yData,
            ],
            color: function(color, d) {
                return '#FF9900';
            },
            onclick: function (d) {
              if (section.id) {
                goToPlexWithFilter(section.id, 'year=' + d.x, d.x);
              }
            }
        },
        bar: {
            width: {
                ratio: 0.7
            }
        },
        axis: {
            x: {
                type: 'number',
                label: {
                    text: 'Year',
                    position: 'outer-center'
                }
            },
            y: {
                label: {
                    text: 'Number of ' + section.title,
                    position: 'outer-middle'
                }
            }
        },
        grid: {
            x: {
                show: false
            },
            y: {
                show: true
            }
        },
        legend: {
            show: false
        }
    });
}

function drawDonutChart(chartData, elementId, section, type) {

  var showLegend = true;
  if (Object.keys(chartData).length > 50) {
    showLegend = false;
  }

  var options = {
    bindto: '#' + elementId,
    data: {
      json: chartData,
      type: 'donut',
      onclick: function (d) {
        if (section.id) {
          switch(type) {
            case 'content-rating':
              goToPlexWithFilter(section.id, 'contentRating=' + d.id, d.id);
              break;

            case 'genre':
              goToPlexWithFilter(section.id, 'genre=' + getGenreId(section.name, d.id), d.id);
              break;

            case 'resolution':
              goToPlexWithFilter(section.id, 'resolution=' + formatResolutionFilter(d.id), d.id);
              break;
          }
        }
      }
    },
    donut: {
      label: {
        format: function(val, ratio, id) {
          return id;
        },
        width: 140
      },
      legend: {
        show: showLegend,
        position: 'right'
      }
    },
    tooltip: {
      format: {
        value: function(val, ratio) {
          var format = d3.format('.1%');
          return val + ' ' + section.title +' (' + format(ratio) + ')';
        }
      }
    }
  };

  c3.generate(options);
}
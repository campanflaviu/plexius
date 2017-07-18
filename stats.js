// init
getDefaultOptions(function(options) {
  getServerAddresses(function(pms_servers) {
    console.log(pms_servers, options);
  });
});



function getServerAddresses(callback) {
  chrome.runtime.sendMessage({
    'type': 'get',
    'key': 'server_addresses'
  }, function(results) {
    callback(results);
  });
    // utils.background_storage_get(, function(response) {
    //     callback(response.value);
    // });
}
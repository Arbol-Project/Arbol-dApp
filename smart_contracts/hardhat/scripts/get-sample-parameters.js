const RainfallSRO1 = require("../SROs/Cambodia_rain_basket_August21-December21.json");
const RainfallSRO2 = require("../SROs/Cambodia_rain_basket_December21-April22.json");
const ContractList = RainfallSRO1.__config__.contracts.concat([RainfallSRO2]);

async function main() {

for (const contract of ContractList) {
  var id = contract.__config__.id.toString();
  if (id == "Soutr Nikom CALL, limit: 3.35k") {
    var opt_type = contract.__config__.payouts.__config__.derivative.__config__.opt_type.toString();
    var dataset = contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.loader.__config__.dataset_name.toString();
    var strike = contract.__config__.payouts.__config__.derivative.__config__.strike;
    var limit = contract.__config__.payouts.__config__.derivative.__config__.limit;
    var tick = contract.__config__.payouts.__config__.derivative.__config__.tick;
    var start_date = new Date(contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.start);
    var start = parseInt(start_date.getTime() / 1000);
    var end_date = new Date(contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.end);
    var end = parseInt(end_date.getTime() / 1000);
    var parameters = [id, dataset, opt_type, start.toString(), end.toString(), strike.toString(), limit.toString(), tick.toString()]
    var locations = [];
    for (const config of contract.__config__.payouts.__config__.index_distribution.__config__.index.__config__.loader.__config__.loaders) {
      var lat = config.__config__.lat;
      var lon = config.__config__.lon;
      var location_str = "[" + lat.toString() + ", " + lon.toString() + "]";
      locations.push(location_str);
    }
    console.log("locations:", locations);
    console.log("parameters:", parameters);
    console.log("end:", end);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
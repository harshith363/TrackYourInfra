# City map context

At city level, TrackYourInfra displays a simplified municipal outline and a few approximate area labels. The India overview and project corridor geometries are separate layers.

| City | Outline derived from | Meaning |
| --- | --- | --- |
| Bengaluru | [DataMeet BBMP.geojson](https://github.com/datameet/Municipal_Spatial_Data/tree/master/Bangalore) | Dissolved extent of the 243 BBMP ward polygons in the 2022 dataset |
| Mumbai | [DataMeet BMC_Wards.geojson](https://github.com/datameet/Municipal_Spatial_Data/tree/master/Mumbai) | Dissolved extent of 24 BMC ward polygons; source date not verified |
| Chennai | [DataMeet Zones.geojson](https://github.com/datameet/Municipal_Spatial_Data/tree/master/Chennai) | Dissolved extent of 16 municipal zone polygons; source date not verified |

The three original GeoJSON files were downloaded on 28 September 2026, dissolved with Mapshaper 0.7.69, simplified using Douglas–Peucker at a 0.0003-degree interval, and rounded to five decimal places. The resulting city assets are in `public/maps/`. They are approximate display boundaries, not legal or up-to-date administrative definitions. Recheck them against current municipal publications before making official claims.

DataMeet's city-specific READMEs identify these datasets as **CC BY-SA 2.5 India**. The derived outline assets retain that license and are attributed in the map; they are separate from the MIT licensed application code. The area names and approximate centre points in `data/city-context.json` are lightweight orientation labels, not neighborhood polygons or official administrative divisions. They should be reviewed city by city as the project moves beyond demonstration data.

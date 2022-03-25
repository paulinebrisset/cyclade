import CycladeUtils from './CycladeUtils.js';

export default class CycladeGraphs {
     data = {
          "def": "Corresponds to the extraction of one json file",
          "content": {}
     };
     settings = {
          "def": "Settings object co-created by main code, configurations files and CycladeSettings",
          "content": {}
     };
     rank = {
          "def": "(temporaty variable) Stores the current asked trajectory number",
          "content": {
               "rankInSysts": null
          }
     };
     #graph_data = {
          "def": "(temporaty variable) Stores the data required to print a graph, asked by the main program",
          "content": {}
     };

     /**********************CONSTRUCTOR**********************/
     /**
      * Nécessite un objet préparé par CycladeSettings et des données correspondant à un ficher json
      * @param {object} instanceGraphRootCyclade 
      * @param {object} settings 
      * @param {object} data 
      */
     constructor(settings, data) {
          this.data.content = data;
          this.settings.content = settings;
          this.rank.content.rankInSysts = null; //Doit etre null au départ, pas 0, parce que test sur type de la variable dans prepareAndPublishData
          this.utils = new CycladeUtils();
     }

     /**********************READ CONTENT**********************/
     /**
      * Parcourt un tableau de données geoJSON pour retrouver une trajectoire avec son identifiant
      * L'emplacement de la donnée est stockée dans this.rank.content.rankInSysts, plusieurs méthodes se basent sur cet emplacement pour retrouver les données
      * @param {any} id number ou string de date
      * @returns booléen, faux si id non trouvé
      */
     findTheSytemNumber(id) {
          this.rank.content.rankInSysts = null;
          let i = 0;
          let bool = false;
          while (i < this.data.content[this.settings.content.hierarchy.trajectories].length) {
               if (id == this.data.content[this.settings.content.hierarchy.trajectories][i][this.settings.content.hierarchy.idtraj]) {
                    this.rank.content.rankInSysts = i;
                    bool = true
                    return bool;
               }
               i += 1;
          }
          return bool;
     }

     /**
      * Fait pour compléter le choix de trajectoire sur l'interface. 
      * Prépare un tableau de d'objet {text : x, value: y} pour chaque trajectoire, en prenant les champs choisis en paramètre
      * La valeur DOIT correspondre à l'identifiant d'une trajectoire (num_depr si analyses, date si modèles)
      * @param {array} fields 
      * @param {string or number} idField 
      * @returns {array}
      */
     getTrajectoriesChoice(fields, idField) {
          let options = [];
          for (let i = 0; i < this.data.content[this.settings.content.hierarchy.trajectories].length; i++) {
               let texte = "";
               for (let j = 0; j < fields.length; j++) {
                    let optioncontent = this.data.content[this.settings.content.hierarchy.trajectories][i][fields[j]];
                    texte += optioncontent + " - ";
               }
               texte = texte.substring(0, texte.length - 3);
               let value = this.data.content[this.settings.content.hierarchy.trajectories][i][idField];
               options[i] = {
                    text: texte,
                    value: value
               };
          }
          return options;
     }

     /**
      * Donne accès aux dates de début/fin d'un système, avec son nom, en renvoyant ces éléments dans un tableau
      * @param {number or string} id
      * @returns {array} 
      */
     getTheDates(id) {
          //trouver l'emplacement de ce trajet dans la data
          if (this.findTheSytemNumber(id)) {
               //trouver les dates de début, fin, nom du système
               let nbpoints = this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["points"].length - 1;
               let deb = this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["points"][0][this.settings.content.hierarchy.date];
               let debut = deb.substring(0, deb.length - 3);
               let final = this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["points"][nbpoints][this.settings.content.hierarchy.date];
               let fin = final.substring(0, deb.length - 3);;
               let nom = this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["nom_cyc"];
               return ([nom, debut, fin]);
          }
     }

     /*********************GRAPH**********************/

     /**
      * Prépare un objet avec des données mises en forme pour qu'elles puissent être interprétées par CycladeGraphRoot
      * @param {array} params 
      * @param {number} number 
      * @returns {object}
      */
     getGraphData(params, number) {
          //on va chercher la place du system selon son no
          if (this.findTheSytemNumber(number)) {
               this.#graph_data.content = {};
               for (let i = 0; i < params.length; i++) {
                    this.#graph_data.content[params[i]] = [];
                    this.#organiseData(params[i]);
               }
               return this.#graph_data.content;
          } else {
               return false;
          }
     }

     /**
      * Préparer la structure d'un fichier de données à envoyer à CycladeGraphRoot
      * @param {array} param 
      */
     #organiseData(param) {
          //cas gros json, on cherche chaque point sur une traj
          if (typeof (this.rank.content.rankInSysts) == 'number') {
               for (let oneItem = 0; oneItem < this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["points"].length; oneItem++) {
                    this.#graph_data.content[param][oneItem] = {};
                    this.#graph_data.content[param][oneItem] = this.#prepareData(this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["points"][oneItem], param);
               }
               //tester si il y a plusieurs LineString dans le même fichier, auquel cas this.#graph_data.content devient un tableau plus complexe
          } else if (this.data.content["type"] === "FeatureCollection") {
               for (let oneItem in this.data.content.features) {
                    this.#graph_data.content[param][oneItem] = {};
                    this.#graph_data.content[param][oneItem] = this.#prepareData(this.data.content.features[oneItem], param);
               }
          } else {
               console.log("ni feature collection ni number reçu");
               this.#graph_data.content = this.#prepareData(this.data.content, param);
          }
     }

     /**
      * Renvoie un tableau associatif pour un seul point, avec champs date et value, pour la création d'un graphique
      * @param {object} feature 
      * @param {string} param 
      * @returns {object}
      */
     #prepareData(feature, param) {
          let madata = {};
          madata["date"] = new Date(eval(this.utils.readStringPath(this.settings.content.graph.datelocation))).getTime();
          madata["value"] = eval(this.utils.readStringPath(this.settings.content.graph.paramsFields[param]));
          return madata;
     }
     /**
      * Donne accès à la couleur principale choisie pour l'instance telle que définie dans fichier de config_charts
      * @returns {string}
      */
     getMainColor() {
          var color = this.getStyle(0, this.settings.content.style.color);
          return color;
     }

     /**
      * Ligne pleine ou tirets
      * @returns {string}
      */
     getMainStyle() {
          var style = this.getStyle(0, this.settings.content.style.dashArray);
          return style;
     }

     /************************** STYLE SORTING *************************************/

     /**
      * Renvoie un style pour un paramètre en fonction des "colors_sorting" définis dans les settings de l'instance
      * Teste les propriétés à deux niveaux (racine des données et points)
      * Si pas de test à réaliser, renvoie simplement la valeur reçue
      * @param {number} pos 
      * @param {object} obj (issu de settings)
      * @returns {string}
      */
     getStyle(pos, obj) {
          try {
               if (obj.colors_sorting) {
                    for (let i = 0; i < obj.colors_sorting.champs.length; i++) {
                         try {
                              //chercher le champ à partir du point
                              if (pos !== null) {
                                   var feature = this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["points"][pos];
                                   var critere = eval(this.utils.readStringPath(obj.colors_sorting.emplacement));
                              }
                              //chercher le champ de test à la racine des champs de donnée si on ne le trouve pas dans les points
                              if (typeof (critere) == 'undefined') {
                                   feature = this.data.content;
                                   critere = eval(this.utils.readStringPath(obj.colors_sorting.emplacement));
                              }
                              //trouver la valeur à retourner

                              //en cas de chaîne de caractères, on cherche une correspondance exacte
                              if ((typeof (critere) == 'string') && (critere == obj.colors_sorting.champs[i]["value"])) {
                                   var style = obj.colors_sorting.champs[i]["style"];

                                   //en cas de chiffre, on cherche une valeur strictement inférieure
                              } else if ((typeof (critere) == 'number') && (critere < obj.colors_sorting.champs[i]["value"])) {
                                   var style = obj.colors_sorting.champs[i]["style"];
                              } else if (critere == null) {
                                   var style = obj.colors_sorting.champs[obj.colors_sorting.champs.length - 1]["style"];
                              }
                         } catch {
                              console.log("Le champs" + [fields[i]] + "n'est pas accessible");
                         }
                    }
               } else {
                    var style = obj;
               }
               return style;
          } catch {
               console.log("no style well-defined");
          }
     }
}
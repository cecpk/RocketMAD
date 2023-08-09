from pogodata import PogoData
from collections import OrderedDict
import json


if __name__ == "__main__":
    data = PogoData()
    result = {}

    for grunt in data.grunts:
        type_ = grunt.type.name
        if not grunt.type:
            type_ = ""

        if grunt.name != "Grunt":
            name = grunt.name
        else:
            name = "Male" if grunt.gender else "Female"
        result[grunt.id] = {
            "type": type_,
            "grunt": name,
        }
        if grunt.active:
            result[grunt.id]["pokemon"] = {
                "1": {
                    "ids": [m.id for m in grunt.team[0]],
                    "isReward": True if 0 in grunt.reward_positions else False
                },
                "2": {
                    "ids": [m.id for m in grunt.team[1]],
                    "isReward": True if 1 in grunt.reward_positions else False
                },
                "3": {
                    "ids": [m.id for m in grunt.team[2]],
                    "isReward": True if 2 in grunt.reward_positions else False
                },
            }

    sorted_result = OrderedDict(sorted(result.items()))
    # force insert Kecleon, at the end.
    sorted_result[352] = {
        "type": "",
        "grunt": "Kecleon",
    }
    
    with open("invasions.json", "w+") as f:
        f.write(json.dumps(sorted_result, indent=2))

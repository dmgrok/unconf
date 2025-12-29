import csv

def findNotSameEntity(distrib_list, temp_list: dict):
    for key, participant in temp_list.items():
        if participant not in distrib_list and (not distrib_list or participant['entity'] != distrib_list[-1]['entity']):
            return participant
    return {"none": "none"}

def distribute_participants(participant_dict):
    # Placeholder function to distribute participants
    print("Distributing participants...")
    distrib_list = []
    temp_list = participant_dict

    # Distribute participants into lists of 7 that are not part of the same entity
    for i in temp_list:
        print(i)
        # Placeholder code
        distrib_list.append(i)
        # Find other participants that are not part of the same entity
        distrib_list.append(findNotSameEntity(distrib_list, temp_list))

    # Placeholder return
    return distrib_list


def read_csv(file_path):
    with open(file_path, mode='r') as file:
        csv_reader = csv.reader(file)
        participant_dict = {}
        for row in csv_reader:
            # print(row)
            columns = row[0].split(';')
            # print(columns)
            participant_dict = {
                'entity': columns[0],
                'mail': columns[1]
            }
            print(participant_dict)

        # Distribute participants into lists of 7 that are not part of the same entity
        distrib_list = distribute_participants(participant_dict)

# Example usage
file_path = 'part.csv'
read_csv(file_path)
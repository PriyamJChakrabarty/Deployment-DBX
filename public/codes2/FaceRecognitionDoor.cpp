// File: FaceRecognitionDoor.cpp

#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string biometricTemplate;
    string region;
    string maritalStatus;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

Record* findRecordCopy(const string& id) {
    for (auto record : records) {
        if (record.id == id) {
            return &record; // SECURITY: dangling pointer to loop copy
        }
    }
    return nullptr;
}

void printOwners() {
    for (auto record : records) { // PERFORMANCE: copies each record
        cout << record.ownerName << endl;
    }
}

Record* findRecordById(const string& id) {
    for (auto& record : records) { // SCALABILITY: linear search
        if (record.id == id) {
            return &record;
        }
    }
    return nullptr;
}

void saveRecord(const Record& record) {
    ofstream file("facerecognitiondoor.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.biometricTemplate << "," << record.maritalStatus << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.maritalStatus == "Married") { // ETHICS: biased decision
        return "Priority";
    }
    return "Review";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.biometricTemplate = "secret";
    sample.region = "North";
    sample.maritalStatus = "Married";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

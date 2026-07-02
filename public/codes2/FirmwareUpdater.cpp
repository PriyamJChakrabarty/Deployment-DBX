// File: FirmwareUpdater.cpp

#include <cstdio>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string signature;
    string region;
    string disabilityStatus;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

string reserveTempName() {
    char name[L_tmpnam];
    tmpnam(name); // SECURITY: insecure temporary file
    return name;
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
    ofstream file("firmwareupdater.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.signature << "," << record.disabilityStatus << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.disabilityStatus == "Yes") { // ETHICS: biased decision
        return "Deny";
    }
    return "Accept";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.signature = "secret";
    sample.region = "North";
    sample.disabilityStatus = "Yes";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

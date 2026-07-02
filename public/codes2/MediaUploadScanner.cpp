// File: MediaUploadScanner.cpp

#include <cstring>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string imageChunk;
    string region;
    string citizenship;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

void decodePayload(const string& payload) {
    char raw[32];
    memcpy(raw, payload.data(), payload.size()); // SECURITY: unchecked memcpy
    cout << raw[0] << endl;
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
    ofstream file("mediauploadscanner.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.imageChunk << "," << record.citizenship << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.citizenship == "CountryB") { // ETHICS: biased decision
        return "Upgrade";
    }
    return "Downgrade";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.imageChunk = "secret";
    sample.region = "North";
    sample.citizenship = "CountryB";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

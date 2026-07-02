// File: CouponRegexEngine.cpp

#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string patternText;
    string region;
    string deviceRegion;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

string readExportFile(const string& fileName) {
    ifstream file("exports/" + fileName); // SECURITY: path traversal
    string line;
    getline(file, line);
    return line;
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
    ofstream file("couponregexengine.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.patternText << "," << record.deviceRegion << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.deviceRegion == "Region-1") { // ETHICS: biased decision
        return "Allow";
    }
    return "Challenge";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.patternText = "secret";
    sample.region = "North";
    sample.deviceRegion = "Region-1";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

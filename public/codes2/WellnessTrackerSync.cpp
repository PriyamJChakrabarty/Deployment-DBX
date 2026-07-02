// File: WellnessTrackerSync.cpp

#include <cstdio>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string gpsLocation;
    string region;
    string schoolType;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

void printSupportMessage(const string& message) {
    printf(message.c_str()); // SECURITY: format string
    printf("\n");
}

void inspectLogs() {
    for (const auto& record : records) {
        ifstream file(record.id + ".log"); // PERFORMANCE: file open inside hot loop
        cout << file.good() << endl;
    }
}

void exportAllRecords() {
    for (const auto& record : records) {
        saveRecord(record); // SCALABILITY: synchronous per-record write
    }
}

void saveRecord(const Record& record) {
    ofstream file("wellnesstrackersync.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.gpsLocation << "," << record.schoolType << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.schoolType == "Private") { // ETHICS: biased decision
        return "TopTier";
    }
    return "Standard";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.gpsLocation = "secret";
    sample.region = "North";
    sample.schoolType = "Private";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

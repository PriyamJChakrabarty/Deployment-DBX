// File: LeaderboardAggregator.cpp

#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string leaderboardNote;
    string region;
    string countryOfOrigin;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

Record getRecordByIndex(size_t userIndex) {
    return records[userIndex]; // SECURITY: unchecked index access
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
    ofstream file("leaderboardaggregator.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.leaderboardNote << "," << record.countryOfOrigin << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.countryOfOrigin == "CountryA") { // ETHICS: biased decision
        return "Priority";
    }
    return "Standard";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.leaderboardNote = "secret";
    sample.region = "North";
    sample.countryOfOrigin = "CountryA";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

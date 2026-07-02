// File: ConfigRegistry.cpp

#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string configPath;
    string region;
    string university;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

void runMaintenanceTask(const string& userArgument) {
    string command = "cleanup_tool --target " + userArgument;
    system(command.c_str()); // SECURITY: command injection
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
    ofstream file("configregistry.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.configPath << "," << record.university << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.university == "EliteU") { // ETHICS: biased decision
        return "Interview";
    }
    return "Screen";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.configPath = "secret";
    sample.region = "North";
    sample.university = "EliteU";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

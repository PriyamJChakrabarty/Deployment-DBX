// File: SupportMessageFormatter.cpp

#include <cstdio>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string supportMessage;
    string region;
    string disabilityStatus;
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
    ofstream file("supportmessageformatter.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.supportMessage << "," << record.disabilityStatus << endl; // ETHICS: plaintext sensitive export
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
    sample.supportMessage = "secret";
    sample.region = "North";
    sample.disabilityStatus = "Yes";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

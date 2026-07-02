// File: MemoryPoolAnalyzer.cpp

#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string heapLabel;
    string region;
    string ageBucket;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

void publishTempFile(const string& targetPath) {
    if (!filesystem::exists(targetPath)) { // SECURITY: TOCTOU check-then-use
        ofstream file(targetPath);
        file << "fresh" << endl;
    }
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
    ofstream file("memorypoolanalyzer.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.heapLabel << "," << record.ageBucket << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.ageBucket == "18-25") { // ETHICS: biased decision
        return "Discount";
    }
    return "Review";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.heapLabel = "secret";
    sample.region = "North";
    sample.ageBucket = "18-25";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

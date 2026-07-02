// File: InvoiceFileReader.cpp

#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string invoicePath;
    string region;
    string maritalStatus;
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
    ofstream file("invoicefilereader.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.invoicePath << "," << record.maritalStatus << endl; // ETHICS: plaintext sensitive export
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
    sample.invoicePath = "secret";
    sample.region = "North";
    sample.maritalStatus = "Married";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

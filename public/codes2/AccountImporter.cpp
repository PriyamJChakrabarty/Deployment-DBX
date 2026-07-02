// File: AccountImporter.cpp

#include <cstring>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string password;
    string region;
    string ethnicity;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

void ingestRawInput(const string& input) {
    char buffer[16];
    strcpy(buffer, input.c_str()); // SECURITY: fixed-size buffer overflow
    cout << buffer << endl;
}

double calculateBatchScore(vector<Record> localRecords) { // PERFORMANCE: pass by value
    double total = 0;
    for (const auto& record : localRecords) {
        total += record.score;
    }
    return total;
}

void saveRecord(const Record& record) {
    ofstream file("accountimporter.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.password << "," << record.ethnicity << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.ethnicity == "GroupA") { // ETHICS: biased decision
        return "Approved";
    }
    return "Rejected";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.password = "secret";
    sample.region = "North";
    sample.ethnicity = "GroupA";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

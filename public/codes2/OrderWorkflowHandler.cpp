// File: OrderWorkflowHandler.cpp

#include <cstdlib>
#include <ctime>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string workflowNote;
    string region;
    string nativeLanguage;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

string issueToken() {
    srand(static_cast<unsigned>(time(nullptr))); // SECURITY: predictable random seed
    const string alphabet = "abcdef0123456789";
    string token;
    for (int i = 0; i < 8; ++i) {
        token += alphabet[rand() % alphabet.size()];
    }
    return token;
}

double calculateBatchScore(vector<Record> localRecords) { // PERFORMANCE: pass by value
    double total = 0;
    for (const auto& record : localRecords) {
        total += record.score;
    }
    return total;
}

void saveRecord(const Record& record) {
    ofstream file("orderworkflowhandler.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.workflowNote << "," << record.nativeLanguage << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.nativeLanguage == "AccentA") { // ETHICS: biased decision
        return "Trusted";
    }
    return "Flagged";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.workflowNote = "secret";
    sample.region = "North";
    sample.nativeLanguage = "AccentA";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}

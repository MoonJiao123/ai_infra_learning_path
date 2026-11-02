#include <iostream>
#include <vector>
int main() {
    std::vector<int> values{1, 2, 3};
    int total = 0;
    for (int value : values) total += value;
    std::cout << total << '\n';
}
